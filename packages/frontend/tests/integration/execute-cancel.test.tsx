import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  ExecutePromptSuccessResponse,
  AbortExecutionResponse,
} from "@promptalicious/shared-infra";

import { ExecutePromptPage } from "@/pages/ExecutePromptPage";
import * as apiClient from "@/services/apiClient";

vi.mock("@/services/apiClient");

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("ExecutePromptPage - Cancel Execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully cancel execution and return to ready state", async () => {
    const user = userEvent.setup();

    let executeReject: (reason: Error) => void;
    const executePromise = new Promise<ExecutePromptSuccessResponse>(
      (_resolve, reject) => {
        executeReject = reject;
      },
    );

    const mockAbortResponse: AbortExecutionResponse = {
      success: true,
      message: "Execution aborted successfully",
    };

    vi.mocked(apiClient.executePrompt).mockReturnValue(executePromise);
    vi.mocked(apiClient.abortExecution).mockImplementation(() => {
      executeReject(new Error("Execution aborted by user"));
      return Promise.resolve(mockAbortResponse);
    });
    vi.mocked(apiClient.getExecutionStatus).mockResolvedValue({
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    });

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText(
      /enter your system prompt here/i,
    );
    const executeButton = screen.getByRole("button", { name: /execute/i });
    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    expect(cancelButton).toBeDisabled();

    await user.type(textarea, "Test prompt for cancellation");
    await user.click(executeButton);

    await waitFor(() => {
      expect(cancelButton).toBeEnabled();
      expect(executeButton).toBeDisabled();
      expect(textarea).toBeDisabled();
    });

    expect(apiClient.executePrompt).toHaveBeenCalled();
    const callArgs = vi.mocked(apiClient.executePrompt).mock.calls[0];
    expect(callArgs?.[0]).toEqual({
      promptText: "Test prompt for cancellation",
    });

    await user.click(cancelButton);

    expect(apiClient.abortExecution).toHaveBeenCalled();

    await waitFor(() => {
      expect(cancelButton).toBeDisabled();
      expect(executeButton).toBeEnabled();
      expect(textarea).toBeEnabled();
    });

    expect(textarea).toHaveValue("Test prompt for cancellation");

    await user.clear(textarea);
    await user.type(textarea, "New prompt after cancel");
    await user.click(executeButton);

    expect(apiClient.executePrompt).toHaveBeenCalledTimes(2);
    const secondCallArgs = vi.mocked(apiClient.executePrompt).mock.calls[1];
    expect(secondCallArgs?.[0]).toEqual({
      promptText: "New prompt after cancel",
    });
  });

  it("should handle abort failure gracefully", async () => {
    const user = userEvent.setup();

    let executeResolve: (value: ExecutePromptSuccessResponse) => void;
    const executePromise = new Promise<ExecutePromptSuccessResponse>(
      (resolve) => {
        executeResolve = resolve;
      },
    );

    const mockAbortError: AbortExecutionResponse = {
      success: false,
      message: "No execution in progress",
      error: {
        errorType: "validation",
        errorMessage: "No execution to abort",
      },
    };

    vi.mocked(apiClient.executePrompt).mockReturnValue(executePromise);
    vi.mocked(apiClient.abortExecution).mockResolvedValue(mockAbortError);

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText(
      /enter your system prompt here/i,
    );
    const executeButton = screen.getByRole("button", { name: /execute/i });
    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    await user.type(textarea, "Test prompt");
    await user.click(executeButton);

    await waitFor(() => {
      expect(cancelButton).toBeEnabled();
    });

    await user.click(cancelButton);

    expect(apiClient.abortExecution).toHaveBeenCalled();

    executeResolve!({
      execution: {
        id: "exec-123",
        promptText: "Test prompt",
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-123",
        promptExecutionId: "exec-123",
        responseText: "Response completed",
        inputTokenCount: 10,
        outputTokenCount: 20,
        totalTokenCount: 30,
        executionDurationMs: 1500,
        estimatedCostGBP: 0.000045,
      },
    });

    await waitFor(() => {
      expect(cancelButton).toBeDisabled();
    });
  });

  it("should preserve prompt text after cancel and allow new execution", async () => {
    const user = userEvent.setup();

    let executeResolve: (value: ExecutePromptSuccessResponse) => void;
    const executePromise = new Promise<ExecutePromptSuccessResponse>(
      (resolve) => {
        executeResolve = resolve;
      },
    );

    const mockAbortResponse: AbortExecutionResponse = {
      success: true,
      message: "Execution aborted",
    };

    const mockNewExecutionResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-new",
        promptText: "New execution after cancel",
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-new",
        promptExecutionId: "exec-new",
        responseText: "New response",
        inputTokenCount: 15,
        outputTokenCount: 25,
        totalTokenCount: 40,
        executionDurationMs: 2000,
        estimatedCostGBP: 0.00006,
      },
    };

    vi.mocked(apiClient.executePrompt)
      .mockReturnValueOnce(executePromise)
      .mockResolvedValueOnce(mockNewExecutionResponse);
    vi.mocked(apiClient.abortExecution).mockResolvedValue(mockAbortResponse);

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText(
      /enter your system prompt here/i,
    );
    const executeButton = screen.getByRole("button", { name: /execute/i });
    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    const originalPrompt = "Original prompt text";
    await user.type(textarea, originalPrompt);
    await user.click(executeButton);

    await waitFor(() => {
      expect(cancelButton).toBeEnabled();
    });

    await user.click(cancelButton);

    executeResolve!({
      execution: {
        id: "exec-cancelled",
        promptText: originalPrompt,
        targetModel: "gpt-4o-mini",
        status: "failed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-cancelled",
        promptExecutionId: "exec-cancelled",
        responseText: "",
        inputTokenCount: 0,
        outputTokenCount: 0,
        totalTokenCount: 0,
        executionDurationMs: 0,
        estimatedCostGBP: 0,
      },
    });

    await waitFor(() => {
      expect(executeButton).toBeEnabled();
    });

    expect(textarea).toHaveValue(originalPrompt);

    await user.clear(textarea);
    await user.type(textarea, "New execution after cancel");
    await user.click(executeButton);

    await waitFor(() => {
      expect(screen.getByText("New response")).toBeInTheDocument();
    });

    expect(screen.getByText("Response")).toBeInTheDocument();
    expect(screen.getByText("Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("should not allow cancel button double-click to cause issues", async () => {
    const user = userEvent.setup();

    let executeResolve: (value: ExecutePromptSuccessResponse) => void;
    const executePromise = new Promise<ExecutePromptSuccessResponse>(
      (resolve) => {
        executeResolve = resolve;
      },
    );

    const mockAbortResponse: AbortExecutionResponse = {
      success: true,
      message: "Execution aborted",
    };

    vi.mocked(apiClient.executePrompt).mockReturnValue(executePromise);
    vi.mocked(apiClient.abortExecution).mockResolvedValue(mockAbortResponse);

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText(
      /enter your system prompt here/i,
    );
    const executeButton = screen.getByRole("button", { name: /execute/i });
    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    await user.type(textarea, "Test prompt");
    await user.click(executeButton);

    await waitFor(() => {
      expect(cancelButton).toBeEnabled();
    });

    await user.click(cancelButton);
    await user.click(cancelButton);

    expect(apiClient.abortExecution).toHaveBeenCalledTimes(2);

    executeResolve!({
      execution: {
        id: "exec-123",
        promptText: "Test prompt",
        targetModel: "gpt-4o-mini",
        status: "failed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-123",
        promptExecutionId: "exec-123",
        responseText: "",
        inputTokenCount: 0,
        outputTokenCount: 0,
        totalTokenCount: 0,
        executionDurationMs: 0,
        estimatedCostGBP: 0,
      },
    });

    await waitFor(() => {
      expect(cancelButton).toBeDisabled();
    });
  });

  it("should maintain UI state consistency during rapid cancel", async () => {
    const user = userEvent.setup();

    const mockAbortResponse: AbortExecutionResponse = {
      success: true,
      message: "Execution aborted",
    };

    let executeReject: (reason: Error) => void;
    const executePromise = new Promise<ExecutePromptSuccessResponse>(
      (_resolve, reject) => {
        executeReject = reject;
      },
    );

    vi.mocked(apiClient.executePrompt).mockReturnValue(executePromise);
    vi.mocked(apiClient.abortExecution).mockImplementation(() => {
      executeReject(new Error("Execution aborted"));
      return Promise.resolve(mockAbortResponse);
    });
    vi.mocked(apiClient.getExecutionStatus).mockResolvedValue({
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    });

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText(
      /enter your system prompt here/i,
    );
    const executeButton = screen.getByRole("button", { name: /execute/i });
    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    await user.type(textarea, "Rapid cancel test");
    await user.click(executeButton);

    await waitFor(() => {
      expect(cancelButton).toBeEnabled();
      expect(executeButton).toBeDisabled();
      expect(textarea).toBeDisabled();
    });

    await user.click(cancelButton);

    expect(apiClient.abortExecution).toHaveBeenCalled();

    await waitFor(() => {
      expect(cancelButton).toBeDisabled();
      expect(executeButton).toBeEnabled();
      expect(textarea).toBeEnabled();
    });

    expect(textarea).toHaveValue("Rapid cancel test");
    expect(screen.queryByText("Response")).not.toBeInTheDocument();
    expect(screen.queryByText("Diagnostics")).not.toBeInTheDocument();
  });
});

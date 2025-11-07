import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type {
  ExecutionStatusResponse,
  ExecutePromptSuccessResponse,
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
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe("ExecutePromptPage - Page Refresh Recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should restore execution state after page refresh and show results when execution completes", async () => {
    const mockInProgressStatus: ExecutionStatusResponse = {
      isExecuting: true,
      execution: {
        id: "exec-123",
        promptText: "Test prompt from before refresh",
        targetModel: "gpt-4o-mini",
        status: "in_progress",
        executionTimestamp: new Date().toISOString(),
      },
      result: undefined,
      error: undefined,
    };

    const mockCompletedStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: {
        id: "exec-123",
        promptText: "Test prompt from before refresh",
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-123",
        promptExecutionId: "exec-123",
        responseText: "This is the response after refresh",
        inputTokenCount: 12,
        outputTokenCount: 45,
        totalTokenCount: 57,
        executionDurationMs: 2500,
        estimatedCostGBP: 0.000068,
      },
      error: undefined,
    };

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    vi.mocked(apiClient.getExecutionStatus)
      .mockResolvedValueOnce(mockInProgressStatus)
      .mockResolvedValueOnce(mockInProgressStatus)
      .mockResolvedValueOnce(mockCompletedStatus)
      .mockResolvedValue(mockNoExecutionStatus);

    vi.mocked(apiClient.executePrompt).mockResolvedValue(
      {} as ExecutePromptSuccessResponse,
    );
    vi.mocked(apiClient.abortExecution).mockResolvedValue({
      success: true,
      message: "Aborted",
    });

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(apiClient.getExecutionStatus).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText(
      /enter your system prompt here/i,
    );
    const executeButton = screen.getByRole("button", { name: /execute/i });
    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    await waitFor(() => {
      expect(textarea).toHaveValue("Test prompt from before refresh");
      expect(textarea).toBeDisabled();
      expect(executeButton).toBeDisabled();
      expect(cancelButton).toBeEnabled();
    });

    await waitFor(
      () => {
        expect(
          screen.getByText("This is the response after refresh"),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(screen.getByText("Response")).toBeInTheDocument();
    expect(screen.getByText("Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("57")).toBeInTheDocument();

    await waitFor(() => {
      expect(executeButton).toBeEnabled();
      expect(cancelButton).toBeDisabled();
      expect(textarea).toBeEnabled();
    });

    expect(textarea).toHaveValue("Test prompt from before refresh");
  });

  it("should handle refresh when execution fails and show error state", async () => {
    const mockInProgressStatus: ExecutionStatusResponse = {
      isExecuting: true,
      execution: {
        id: "exec-fail",
        promptText: "Prompt that will fail",
        targetModel: "gpt-4o-mini",
        status: "in_progress",
        executionTimestamp: new Date().toISOString(),
      },
      result: undefined,
      error: undefined,
    };

    const mockFailedStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: {
        id: "exec-fail",
        promptText: "Prompt that will fail",
        targetModel: "gpt-4o-mini",
        status: "failed",
        executionTimestamp: new Date().toISOString(),
      },
      result: undefined,
      error: {
        id: "error-123",
        promptExecutionId: "exec-fail",
        errorType: "authentication",
        errorMessage: "Invalid API key",
        timestamp: new Date().toISOString(),
      },
    };

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    vi.mocked(apiClient.getExecutionStatus)
      .mockResolvedValueOnce(mockInProgressStatus)
      .mockResolvedValueOnce(mockInProgressStatus)
      .mockResolvedValueOnce(mockFailedStatus)
      .mockResolvedValue(mockNoExecutionStatus);

    vi.mocked(apiClient.executePrompt).mockResolvedValue(
      {} as ExecutePromptSuccessResponse,
    );
    vi.mocked(apiClient.abortExecution).mockResolvedValue({
      success: true,
      message: "Aborted",
    });

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(apiClient.getExecutionStatus).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText(
      /enter your system prompt here/i,
    );
    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    await waitFor(() => {
      expect(textarea).toHaveValue("Prompt that will fail");
      expect(cancelButton).toBeEnabled();
    });

    await waitFor(
      () => {
        expect(screen.getByText("Invalid API key")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(screen.getByText("Authentication Error")).toBeInTheDocument();

    await waitFor(() => {
      expect(cancelButton).toBeDisabled();
    });
  });

  it("should allow cancel during recovered execution state", async () => {
    const mockInProgressStatus: ExecutionStatusResponse = {
      isExecuting: true,
      execution: {
        id: "exec-cancel",
        promptText: "Execution to cancel after refresh",
        targetModel: "gpt-4o-mini",
        status: "in_progress",
        executionTimestamp: new Date().toISOString(),
      },
      result: undefined,
      error: undefined,
    };

    const mockAbortedStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: {
        id: "exec-cancel",
        promptText: "Execution to cancel after refresh",
        targetModel: "gpt-4o-mini",
        status: "failed",
        executionTimestamp: new Date().toISOString(),
      },
      result: undefined,
      error: {
        id: "error-abort",
        promptExecutionId: "exec-cancel",
        errorType: "aborted",
        errorMessage: "Execution was cancelled by user",
        timestamp: new Date().toISOString(),
      },
    };

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    vi.mocked(apiClient.getExecutionStatus)
      .mockResolvedValueOnce(mockInProgressStatus)
      .mockResolvedValueOnce(mockInProgressStatus)
      .mockResolvedValueOnce(mockAbortedStatus)
      .mockResolvedValue(mockNoExecutionStatus);

    vi.mocked(apiClient.abortExecution).mockResolvedValue({
      success: true,
      message: "Execution aborted successfully",
    });

    vi.mocked(apiClient.executePrompt).mockResolvedValue(
      {} as ExecutePromptSuccessResponse,
    );

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(apiClient.getExecutionStatus).toHaveBeenCalled();
    });

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    const executeButton = screen.getByRole("button", { name: /execute/i });
    const textarea = screen.getByPlaceholderText(
      /enter your system prompt here/i,
    );

    await waitFor(() => {
      expect(cancelButton).toBeEnabled();
      expect(executeButton).toBeDisabled();
    });

    await screen.findByDisplayValue("Execution to cancel after refresh");

    cancelButton.click();

    await waitFor(() => {
      expect(apiClient.abortExecution).toHaveBeenCalled();
    });

    await waitFor(
      () => {
        expect(cancelButton).toBeDisabled();
        expect(executeButton).toBeEnabled();
      },
      { timeout: 5000 },
    );

    expect(textarea).toHaveValue("Execution to cancel after refresh");
  });

  it("should handle refresh when no execution is in progress", async () => {
    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    vi.mocked(apiClient.getExecutionStatus).mockResolvedValue(
      mockNoExecutionStatus,
    );

    vi.mocked(apiClient.executePrompt).mockResolvedValue(
      {} as ExecutePromptSuccessResponse,
    );
    vi.mocked(apiClient.abortExecution).mockResolvedValue({
      success: true,
      message: "Aborted",
    });

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(apiClient.getExecutionStatus).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText(
      /enter your system prompt here/i,
    );
    const executeButton = screen.getByRole("button", { name: /execute/i });
    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    expect(textarea).toHaveValue("");
    expect(textarea).toBeEnabled();
    expect(executeButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();

    expect(screen.queryByText("Response")).not.toBeInTheDocument();
    expect(screen.queryByText("Diagnostics")).not.toBeInTheDocument();
  });

  it("should handle multiple status polls before execution completes", async () => {
    const mockInProgressStatus: ExecutionStatusResponse = {
      isExecuting: true,
      execution: {
        id: "exec-long",
        promptText: "Long running execution",
        targetModel: "gpt-4o-mini",
        status: "in_progress",
        executionTimestamp: new Date().toISOString(),
      },
      result: undefined,
      error: undefined,
    };

    const mockCompletedStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: {
        id: "exec-long",
        promptText: "Long running execution",
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-long",
        promptExecutionId: "exec-long",
        responseText: "Final response after multiple polls",
        inputTokenCount: 8,
        outputTokenCount: 30,
        totalTokenCount: 38,
        executionDurationMs: 5000,
        estimatedCostGBP: 0.000045,
      },
      error: undefined,
    };

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    vi.mocked(apiClient.getExecutionStatus)
      .mockResolvedValueOnce(mockInProgressStatus)
      .mockResolvedValueOnce(mockInProgressStatus)
      .mockResolvedValueOnce(mockInProgressStatus)
      .mockResolvedValueOnce(mockInProgressStatus)
      .mockResolvedValueOnce(mockCompletedStatus)
      .mockResolvedValue(mockNoExecutionStatus);

    vi.mocked(apiClient.executePrompt).mockResolvedValue(
      {} as ExecutePromptSuccessResponse,
    );
    vi.mocked(apiClient.abortExecution).mockResolvedValue({
      success: true,
      message: "Aborted",
    });

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(apiClient.getExecutionStatus).toHaveBeenCalled();
    });

    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    await waitFor(() => {
      expect(cancelButton).toBeEnabled();
    });

    await waitFor(
      () => {
        expect(
          screen.getByText("Final response after multiple polls"),
        ).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    expect(apiClient.getExecutionStatus).toHaveBeenCalledTimes(5);

    await waitFor(() => {
      expect(cancelButton).toBeDisabled();
    });
  }, 15000);
});

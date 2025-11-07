import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("ExecutePromptPage - Successful Execution Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete full execution flow: prompt → execute → see results with diagnostics", async () => {
    const user = userEvent.setup();

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    const mockSuccessResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-success-123",
        promptText: "Write a haiku about testing",
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-success-123",
        promptExecutionId: "exec-success-123",
        responseText:
          "Tests run with care\nGreen lights bring developer joy\nCode quality reigns",
        inputTokenCount: 25,
        outputTokenCount: 42,
        totalTokenCount: 67,
        executionDurationMs: 1850,
        estimatedCostGBP: 0.000078,
      },
    };

    vi.mocked(apiClient.getExecutionStatus).mockResolvedValue(
      mockNoExecutionStatus,
    );

    vi.mocked(apiClient.executePrompt).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockSuccessResponse), 50);
        }),
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

    const testPrompt = "Write a haiku about testing";
    await user.type(textarea, testPrompt);

    await waitFor(() => {
      expect(executeButton).toBeEnabled();
    });

    expect(cancelButton).toBeDisabled();

    await user.click(executeButton);

    await waitFor(() => {
      expect(apiClient.executePrompt).toHaveBeenCalled();
    });

    const callArgs = vi.mocked(apiClient.executePrompt).mock.calls[0];
    expect(callArgs?.[0]).toEqual({ promptText: testPrompt });

    await waitFor(() => {
      expect(textarea).toBeDisabled();
      expect(executeButton).toBeDisabled();
      expect(cancelButton).toBeEnabled();
    });

    await waitFor(() => {
      expect(screen.getByText(/Tests run with care/)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Green lights bring developer joy/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Code quality reigns/)).toBeInTheDocument();

    expect(screen.getByText("Response")).toBeInTheDocument();
    expect(screen.getByText("Diagnostics")).toBeInTheDocument();

    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("67")).toBeInTheDocument();

    expect(screen.getByText("1,850 ms")).toBeInTheDocument();
    expect(screen.getByText("£0.000078")).toBeInTheDocument();

    await waitFor(() => {
      expect(textarea).toBeEnabled();
      expect(executeButton).toBeEnabled();
      expect(cancelButton).toBeDisabled();
    });

    expect(textarea).toHaveValue(testPrompt);
  });

  it("should show loading state during execution", async () => {
    const user = userEvent.setup();

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    vi.mocked(apiClient.getExecutionStatus).mockResolvedValue(
      mockNoExecutionStatus,
    );

    vi.mocked(apiClient.executePrompt).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              execution: {
                id: "exec-slow",
                promptText: "Test slow response",
                targetModel: "gpt-4o-mini",
                status: "completed",
                executionTimestamp: new Date().toISOString(),
              },
              result: {
                id: "result-slow",
                promptExecutionId: "exec-slow",
                responseText: "Slow response text",
                inputTokenCount: 10,
                outputTokenCount: 15,
                totalTokenCount: 25,
                executionDurationMs: 3000,
                estimatedCostGBP: 0.000045,
              },
            });
          }, 100);
        }),
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

    const testPrompt = "Test slow response";
    await user.type(textarea, testPrompt);

    await waitFor(() => {
      expect(executeButton).toBeEnabled();
    });

    await user.click(executeButton);

    await waitFor(() => {
      expect(textarea).toBeDisabled();
      expect(executeButton).toBeDisabled();
      expect(cancelButton).toBeEnabled();
    });

    await waitFor(() => {
      expect(screen.getByText("Slow response text")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(textarea).toBeEnabled();
      expect(executeButton).toBeEnabled();
      expect(cancelButton).toBeDisabled();
    });
  });

  it("should display all diagnostic metrics correctly", async () => {
    const user = userEvent.setup();

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    const mockSuccessResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-metrics",
        promptText: "Test diagnostic display",
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-metrics",
        promptExecutionId: "exec-metrics",
        responseText: "Response with detailed metrics",
        inputTokenCount: 123,
        outputTokenCount: 456,
        totalTokenCount: 579,
        executionDurationMs: 2345,
        estimatedCostGBP: 0.001234,
      },
    };

    vi.mocked(apiClient.getExecutionStatus).mockResolvedValue(
      mockNoExecutionStatus,
    );

    vi.mocked(apiClient.executePrompt).mockResolvedValue(mockSuccessResponse);

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

    const testPrompt = "Test diagnostic display";
    await user.type(textarea, testPrompt);

    await waitFor(() => {
      expect(executeButton).toBeEnabled();
    });

    await user.click(executeButton);

    await waitFor(() => {
      expect(
        screen.getByText("Response with detailed metrics"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Diagnostics")).toBeInTheDocument();

    expect(screen.getByText("Input Tokens")).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();

    expect(screen.getByText("Output Tokens")).toBeInTheDocument();
    expect(screen.getByText("456")).toBeInTheDocument();

    expect(screen.getByText("Total Tokens")).toBeInTheDocument();
    expect(screen.getByText("579")).toBeInTheDocument();

    expect(screen.getByText("Execution Duration")).toBeInTheDocument();
    expect(screen.getByText("2,345 ms")).toBeInTheDocument();

    expect(screen.getByText("Estimated Cost")).toBeInTheDocument();
    expect(screen.getByText("£0.001234")).toBeInTheDocument();
  });

  it("should preserve prompt text after successful execution", async () => {
    const user = userEvent.setup();

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    const mockSuccessResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-preserve",
        promptText: "Preserved prompt text",
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-preserve",
        promptExecutionId: "exec-preserve",
        responseText: "Response to preserved prompt",
        inputTokenCount: 18,
        outputTokenCount: 22,
        totalTokenCount: 40,
        executionDurationMs: 1500,
        estimatedCostGBP: 0.000065,
      },
    };

    vi.mocked(apiClient.getExecutionStatus).mockResolvedValue(
      mockNoExecutionStatus,
    );

    vi.mocked(apiClient.executePrompt).mockResolvedValue(mockSuccessResponse);

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

    const testPrompt = "Preserved prompt text";
    await user.type(textarea, testPrompt);

    await waitFor(() => {
      expect(executeButton).toBeEnabled();
    });

    await user.click(executeButton);

    await waitFor(() => {
      expect(
        screen.getByText("Response to preserved prompt"),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(textarea).toBeEnabled();
    });

    expect(textarea).toHaveValue(testPrompt);

    expect(screen.getByText("Response")).toBeInTheDocument();
    expect(screen.getByText("Diagnostics")).toBeInTheDocument();
  });
});

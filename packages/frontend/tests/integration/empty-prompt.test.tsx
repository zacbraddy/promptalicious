import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type {
  ExecutionStatusResponse,
  PricingInfoResponse,
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

describe("ExecutePromptPage - Empty Prompt Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const mockPricingResponse: PricingInfoResponse = {
      pricing: {
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUSD: 0.00015,
        outputTokenPriceUSD: 0.0006,
        lastUpdated: new Date().toISOString(),
      },
      exchangeRate: {
        baseCurrency: "USD",
        targetCurrency: "GBP",
        rate: 0.79,
        lastUpdated: new Date().toISOString(),
      },
      staleness: {
        isStale: false,
        daysSinceUpdate: 0,
      },
    };

    vi.mocked(apiClient.getPricing).mockResolvedValue(mockPricingResponse);
  });

  it("should disable execute button when prompt is empty", async () => {
    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    vi.mocked(apiClient.getExecutionStatus).mockResolvedValue(
      mockNoExecutionStatus,
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

    expect(textarea).toHaveValue("");
    expect(executeButton).toBeDisabled();
  });

  it("should disable execute button when prompt contains only whitespace", async () => {
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

    await user.type(textarea, "   \n  \t  ");

    await waitFor(() => {
      expect(executeButton).toBeDisabled();
    });

    expect(executeButton).toBeDisabled();
  });

  it("should enable execute button when prompt has actual content", async () => {
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

    expect(executeButton).toBeDisabled();

    await user.type(textarea, "Valid prompt text");

    await waitFor(() => {
      expect(executeButton).toBeEnabled();
    });
  });

  it("should disable execute button when clearing prompt text", async () => {
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

    await user.type(textarea, "Some text");

    await waitFor(() => {
      expect(executeButton).toBeEnabled();
    });

    await user.clear(textarea);

    await waitFor(() => {
      expect(executeButton).toBeDisabled();
    });
  });

  it("should not call executePrompt API when execute button is disabled", async () => {
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

    vi.mocked(apiClient.executePrompt).mockResolvedValue({
      execution: {
        id: "test-id",
        promptText: "",
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-id",
        promptExecutionId: "test-id",
        responseText: "Should not reach here",
        inputTokenCount: 0,
        outputTokenCount: 0,
        totalTokenCount: 0,
        executionDurationMs: 0,
        estimatedCostGBP: 0,
      },
    });

    vi.mocked(apiClient.abortExecution).mockResolvedValue({
      success: true,
      message: "Aborted",
    });

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(apiClient.getExecutionStatus).toHaveBeenCalled();
    });

    const executeButton = screen.getByRole("button", { name: /execute/i });

    expect(executeButton).toBeDisabled();

    await user.click(executeButton);

    expect(apiClient.executePrompt).not.toHaveBeenCalled();
  });
});

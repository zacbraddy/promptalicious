import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  ExecutionStatusResponse,
  ExecutePromptSuccessResponse,
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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("ExecutePromptPage - Special Characters", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const mockPricingResponse: PricingInfoResponse = {
      pricing: {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUSD: 0.00015,
        outputTokenPriceUSD: 0.0006,
        lastUpdated: new Date().toISOString(),
      },
      exchangeRate: {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
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

  it("should handle special programming characters in prompts", async () => {
    const user = userEvent.setup();
    const specialCharsPrompt = "Test prompt with && || >= <= != === characters";

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    const mockSuccessResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-123",
        promptText: specialCharsPrompt,
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-123",
        promptExecutionId: "exec-123",
        responseText:
          "Response with special chars preserved: && || >= <= != ===",
        inputTokenCount: 15,
        outputTokenCount: 20,
        totalTokenCount: 35,
        executionDurationMs: 1200,
        estimatedCostGBP: 0.0023,
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

    await user.type(textarea, specialCharsPrompt);
    await user.click(executeButton);

    await waitFor(() => {
      const callArgs = vi.mocked(apiClient.executePrompt).mock.calls[0];
      expect(callArgs?.[0]).toEqual({ promptText: specialCharsPrompt });
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          /Response with special chars preserved: && \|\| >= <= != ===/,
        ),
      ).toBeInTheDocument();
    });
  });

  it("should handle unicode characters in prompts", async () => {
    const user = userEvent.setup();
    const unicodePrompt = "Currency symbols: € £ ¥ © ® ™";

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    const mockSuccessResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-124",
        promptText: unicodePrompt,
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-124",
        promptExecutionId: "exec-124",
        responseText: "Unicode preserved: € £ ¥ © ® ™",
        inputTokenCount: 12,
        outputTokenCount: 18,
        totalTokenCount: 30,
        executionDurationMs: 1100,
        estimatedCostGBP: 0.0019,
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

    await user.type(textarea, unicodePrompt);
    await user.click(executeButton);

    await waitFor(() => {
      const callArgs = vi.mocked(apiClient.executePrompt).mock.calls[0];
      expect(callArgs?.[0]).toEqual({ promptText: unicodePrompt });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Unicode preserved: € £ ¥ © ® ™/),
      ).toBeInTheDocument();
    });
  });

  it("should handle emojis in prompts", async () => {
    const user = userEvent.setup();
    const emojiPrompt = "Test with emoji: 🤖 🚀 ✨";

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    const mockSuccessResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-125",
        promptText: emojiPrompt,
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-125",
        promptExecutionId: "exec-125",
        responseText: "Emojis work: 🤖 🚀 ✨",
        inputTokenCount: 10,
        outputTokenCount: 15,
        totalTokenCount: 25,
        executionDurationMs: 1000,
        estimatedCostGBP: 0.0016,
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

    await user.type(textarea, emojiPrompt);
    await user.click(executeButton);

    await waitFor(() => {
      const callArgs = vi.mocked(apiClient.executePrompt).mock.calls[0];
      expect(callArgs?.[0]).toEqual({ promptText: emojiPrompt });
    });

    await waitFor(() => {
      expect(screen.getByText(/Emojis work: 🤖 🚀 ✨/)).toBeInTheDocument();
    });
  });

  it("should handle quotes and apostrophes in prompts", async () => {
    const user = userEvent.setup();
    const quotesPrompt = `Test "double quotes" and 'single quotes' and it's working`;

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    const mockSuccessResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-126",
        promptText: quotesPrompt,
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-126",
        promptExecutionId: "exec-126",
        responseText: `Quotes preserved: "double" 'single' it's`,
        inputTokenCount: 18,
        outputTokenCount: 22,
        totalTokenCount: 40,
        executionDurationMs: 1300,
        estimatedCostGBP: 0.0025,
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

    await user.type(textarea, quotesPrompt);
    await user.click(executeButton);

    await waitFor(() => {
      const callArgs = vi.mocked(apiClient.executePrompt).mock.calls[0];
      expect(callArgs?.[0]).toEqual({ promptText: quotesPrompt });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Quotes preserved: "double" 'single' it's/),
      ).toBeInTheDocument();
    });
  });

  it("should handle newlines and tabs in prompts", async () => {
    const user = userEvent.setup();
    const multilinePrompt = "Line 1\nLine 2\n\tIndented line";

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    const mockSuccessResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-127",
        promptText: multilinePrompt,
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-127",
        promptExecutionId: "exec-127",
        responseText: "Multiline response\nwith newlines\n\tand tabs",
        inputTokenCount: 14,
        outputTokenCount: 19,
        totalTokenCount: 33,
        executionDurationMs: 1150,
        estimatedCostGBP: 0.0021,
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

    await user.type(textarea, multilinePrompt);
    await user.click(executeButton);

    await waitFor(() => {
      const callArgs = vi.mocked(apiClient.executePrompt).mock.calls[0];
      expect(callArgs?.[0]).toEqual({ promptText: multilinePrompt });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Multiline response.*with newlines/),
      ).toBeInTheDocument();
    });
  });

  it("should handle mixed special characters without corruption", async () => {
    const user = userEvent.setup();
    const mixedPrompt = `<div class="test" id='123'>Content & "quoted" text</div>`;

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    const mockSuccessResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-128",
        promptText: mixedPrompt,
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-128",
        promptExecutionId: "exec-128",
        responseText: `HTML preserved: <div class="test">Content & "quoted"</div>`,
        inputTokenCount: 20,
        outputTokenCount: 25,
        totalTokenCount: 45,
        executionDurationMs: 1400,
        estimatedCostGBP: 0.0028,
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

    await user.type(textarea, mixedPrompt);
    await user.click(executeButton);

    await waitFor(() => {
      const callArgs = vi.mocked(apiClient.executePrompt).mock.calls[0];
      expect(callArgs?.[0]).toEqual({ promptText: mixedPrompt });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/HTML preserved:.*Content & "quoted"/),
      ).toBeInTheDocument();
    });
  });
});

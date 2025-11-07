import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
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

describe("Pricing Staleness Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display staleness warning when pricing data is >7 days old", async () => {
    const user = userEvent.setup();

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);

    const mockStalePricingResponse: PricingInfoResponse = {
      pricing: {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUSD: 0.00000015,
        outputTokenPriceUSD: 0.0000006,
        lastUpdated: oldDate.toISOString(),
      },
      exchangeRate: {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: 0.79,
        lastUpdated: oldDate.toISOString(),
      },
      staleness: {
        isStale: true,
        daysSinceUpdate: 10,
      },
    };

    const mockSuccessResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-stale-test",
        promptText: "Test stale pricing",
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-stale-test",
        promptExecutionId: "exec-stale-test",
        responseText: "Test response",
        inputTokenCount: 10,
        outputTokenCount: 20,
        totalTokenCount: 30,
        executionDurationMs: 1500,
        estimatedCostGBP: 0.000045,
      },
    };

    vi.mocked(apiClient.executePrompt).mockResolvedValue(mockSuccessResponse);
    vi.mocked(apiClient.getPricing).mockResolvedValue(mockStalePricingResponse);
    vi.mocked(apiClient.abortExecution).mockResolvedValue({
      success: true,
      message: "Aborted",
    });

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText(
      /enter your system prompt here/i,
    );
    const executeButton = screen.getByRole("button", { name: /execute/i });

    await user.type(textarea, "Test stale pricing");
    await user.click(executeButton);

    await waitFor(() => {
      expect(
        screen.getByText("Pricing Information", { selector: "h2" }),
      ).toBeVisible();
    });

    expect(screen.getByText("10 days old")).toBeInTheDocument();

    expect(apiClient.getPricing).toHaveBeenCalled();
  });

  it("should not display staleness warning when pricing data is fresh (<7 days)", async () => {
    const user = userEvent.setup();

    const mockFreshPricingResponse: PricingInfoResponse = {
      pricing: {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUSD: 0.00000015,
        outputTokenPriceUSD: 0.0000006,
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

    const mockSuccessResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-fresh-test",
        promptText: "Test fresh pricing",
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-fresh-test",
        promptExecutionId: "exec-fresh-test",
        responseText: "Test response",
        inputTokenCount: 10,
        outputTokenCount: 20,
        totalTokenCount: 30,
        executionDurationMs: 1500,
        estimatedCostGBP: 0.000045,
      },
    };

    vi.mocked(apiClient.executePrompt).mockResolvedValue(mockSuccessResponse);
    vi.mocked(apiClient.getPricing).mockResolvedValue(mockFreshPricingResponse);
    vi.mocked(apiClient.abortExecution).mockResolvedValue({
      success: true,
      message: "Aborted",
    });

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText(
      /enter your system prompt here/i,
    );
    const executeButton = screen.getByRole("button", { name: /execute/i });

    await user.type(textarea, "Test fresh pricing");
    await user.click(executeButton);

    await waitFor(() => {
      expect(
        screen.getByText("Pricing Information", { selector: "h2" }),
      ).toBeVisible();
    });

    expect(screen.queryByText(/days old/i)).not.toBeInTheDocument();
  });

  it("should display correct number of days in staleness warning", async () => {
    const user = userEvent.setup();

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 15);

    const mockStalePricingResponse: PricingInfoResponse = {
      pricing: {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUSD: 0.00000015,
        outputTokenPriceUSD: 0.0000006,
        lastUpdated: oldDate.toISOString(),
      },
      exchangeRate: {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: 0.79,
        lastUpdated: oldDate.toISOString(),
      },
      staleness: {
        isStale: true,
        daysSinceUpdate: 15,
      },
    };

    const mockSuccessResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-15-days",
        promptText: "Test 15 days old pricing",
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-15-days",
        promptExecutionId: "exec-15-days",
        responseText: "Test response",
        inputTokenCount: 10,
        outputTokenCount: 20,
        totalTokenCount: 30,
        executionDurationMs: 1500,
        estimatedCostGBP: 0.000045,
      },
    };

    vi.mocked(apiClient.executePrompt).mockResolvedValue(mockSuccessResponse);
    vi.mocked(apiClient.getPricing).mockResolvedValue(mockStalePricingResponse);
    vi.mocked(apiClient.abortExecution).mockResolvedValue({
      success: true,
      message: "Aborted",
    });

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText(
      /enter your system prompt here/i,
    );
    const executeButton = screen.getByRole("button", { name: /execute/i });

    await user.type(textarea, "Test 15 days old pricing");
    await user.click(executeButton);

    await waitFor(() => {
      expect(
        screen.getByText("Pricing Information", { selector: "h2" }),
      ).toBeVisible();
    });

    expect(screen.getByText("15 days old")).toBeInTheDocument();
  });

  it("should display staleness warning when pricing data is exactly 8 days old", async () => {
    const user = userEvent.setup();

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 8);

    const mockStalePricingResponse: PricingInfoResponse = {
      pricing: {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUSD: 0.00000015,
        outputTokenPriceUSD: 0.0000006,
        lastUpdated: oldDate.toISOString(),
      },
      exchangeRate: {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: 0.79,
        lastUpdated: oldDate.toISOString(),
      },
      staleness: {
        isStale: true,
        daysSinceUpdate: 8,
      },
    };

    const mockSuccessResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-8-days",
        promptText: "Test 8 days old pricing",
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-8-days",
        promptExecutionId: "exec-8-days",
        responseText: "Test response",
        inputTokenCount: 10,
        outputTokenCount: 20,
        totalTokenCount: 30,
        executionDurationMs: 1500,
        estimatedCostGBP: 0.000045,
      },
    };

    vi.mocked(apiClient.executePrompt).mockResolvedValue(mockSuccessResponse);
    vi.mocked(apiClient.getPricing).mockResolvedValue(mockStalePricingResponse);
    vi.mocked(apiClient.abortExecution).mockResolvedValue({
      success: true,
      message: "Aborted",
    });

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText(
      /enter your system prompt here/i,
    );
    const executeButton = screen.getByRole("button", { name: /execute/i });

    await user.type(textarea, "Test 8 days old pricing");
    await user.click(executeButton);

    await waitFor(() => {
      expect(
        screen.getByText("Pricing Information", { selector: "h2" }),
      ).toBeVisible();
    });

    expect(screen.getByText("8 days old")).toBeInTheDocument();
  });
});

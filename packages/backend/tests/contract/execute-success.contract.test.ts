import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ExecutePromptRequest,
  ExecutePromptSuccessResponse,
  ExecutePromptErrorResponse,
} from "@promptalicious/shared-infra";

import app from "@/app";
import * as configService from "@/services/configService";
import * as costCalculationService from "@/services/costCalculationService";
import * as exchangeRateService from "@/services/exchangeRateService";
import * as llmService from "@/services/llmService";
import * as pricingService from "@/services/pricingService";
import { executionStateCacheService } from "@/services/executionStateCacheService";

vi.mock("@/services/llmService");
vi.mock("@/services/costCalculationService");
vi.mock("@/services/configService");
vi.mock("@/services/pricingService");
vi.mock("@/services/exchangeRateService");

describe("POST /execute endpoint contract (Success Response)", () => {
  const validRequest: ExecutePromptRequest = {
    promptText:
      "You are a helpful assistant. Explain TypeScript generics in 2-3 sentences.",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(configService.getConfig).mockResolvedValue({
      id: 1,
      selectedModel: "gpt-4o-mini",
      baseURL: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    });

    vi.mocked(configService.getApiKey).mockResolvedValue(
      "sk-test-mock-api-key",
    );

    vi.mocked(llmService.executePrompt).mockResolvedValue({
      responseText:
        "TypeScript generics allow you to create reusable components that work with multiple types while maintaining type safety. They use angle brackets <T> to define type parameters that are determined when the function or class is used.",
      inputTokenCount: 15,
      outputTokenCount: 42,
      totalTokenCount: 57,
      executionDurationMs: 1842,
    });

    vi.mocked(pricingService.getPricingData).mockResolvedValue({
      id: 1,
      model: "gpt-4o-mini",
      provider: "openai",
      inputTokenPriceUsd: 0.00000015,
      outputTokenPriceUsd: 0.0000006,
      lastUpdated: new Date("2025-01-01T00:00:00.000Z"),
      isStale: false,
      daysSinceUpdate: 0,
    });

    vi.mocked(exchangeRateService.getExchangeRate).mockResolvedValue({
      id: 1,
      fromCurrency: "USD",
      toCurrency: "GBP",
      rate: 0.79,
      lastUpdated: new Date("2025-01-01T00:00:00.000Z"),
      isStale: false,
      daysSinceUpdate: 0,
    });

    vi.mocked(costCalculationService.calculateCost).mockImplementation(
      (inputTokens, outputTokens, inputPrice, outputPrice, exchangeRate) => {
        return (
          inputTokens * inputPrice * exchangeRate +
          outputTokens * outputPrice * exchangeRate
        );
      },
    );
  });

  describe("Success responses (200)", () => {
    it("should return 200 status for valid prompt execution", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      expect(response.status).toBe(200);
    });

    it("should return response matching ExecutePromptSuccessResponse schema", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptSuccessResponse;

      expect(data).toHaveProperty("execution");
      expect(data).toHaveProperty("result");
    });
  });

  describe("Execution object validation", () => {
    it("should include all required execution fields", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptSuccessResponse;

      expect(data.execution).toHaveProperty("id");
      expect(data.execution).toHaveProperty("promptText");
      expect(data.execution).toHaveProperty("executionTimestamp");
      expect(data.execution).toHaveProperty("status");
      expect(data.execution).toHaveProperty("targetModel");

      expect(typeof data.execution.id).toBe("string");
      expect(typeof data.execution.promptText).toBe("string");
      expect(typeof data.execution.executionTimestamp).toBe("string");
      expect(typeof data.execution.status).toBe("string");
      expect(typeof data.execution.targetModel).toBe("string");
    });

    it("should have execution status as completed on success", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptSuccessResponse;

      expect(data.execution.status).toBe("completed");
    });

    it("should have execution timestamp in valid ISO 8601 format", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptSuccessResponse;

      expect(() => new Date(data.execution.executionTimestamp)).not.toThrow();
      expect(new Date(data.execution.executionTimestamp).toISOString()).toBe(
        data.execution.executionTimestamp,
      );
    });

    it("should preserve the original prompt text in execution", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptSuccessResponse;

      expect(data.execution.promptText).toBe(validRequest.promptText);
    });
  });

  describe("Result object validation (diagnostic data)", () => {
    it("should include all required result fields with diagnostic data", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptSuccessResponse;

      expect(data.result).toHaveProperty("id");
      expect(data.result).toHaveProperty("promptExecutionId");
      expect(data.result).toHaveProperty("responseText");
      expect(data.result).toHaveProperty("inputTokenCount");
      expect(data.result).toHaveProperty("outputTokenCount");
      expect(data.result).toHaveProperty("totalTokenCount");
      expect(data.result).toHaveProperty("executionDurationMs");
      expect(data.result).toHaveProperty("estimatedCostGBP");

      expect(typeof data.result.id).toBe("string");
      expect(typeof data.result.promptExecutionId).toBe("string");
      expect(typeof data.result.responseText).toBe("string");
      expect(typeof data.result.inputTokenCount).toBe("number");
      expect(typeof data.result.outputTokenCount).toBe("number");
      expect(typeof data.result.totalTokenCount).toBe("number");
      expect(typeof data.result.executionDurationMs).toBe("number");
      expect(typeof data.result.estimatedCostGBP).toBe("number");
    });

    it("should have valid diagnostic values (token counts > 0, duration > 0, cost >= 0)", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptSuccessResponse;

      expect(data.result.inputTokenCount).toBeGreaterThan(0);
      expect(data.result.outputTokenCount).toBeGreaterThanOrEqual(0);
      expect(data.result.totalTokenCount).toBeGreaterThan(0);
      expect(data.result.executionDurationMs).toBeGreaterThan(0);
      expect(data.result.estimatedCostGBP).toBeGreaterThanOrEqual(0);
    });

    it("should have totalTokenCount equal to inputTokenCount + outputTokenCount", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptSuccessResponse;

      expect(data.result.totalTokenCount).toBe(
        data.result.inputTokenCount + data.result.outputTokenCount,
      );
    });

    it("should return non-empty response text from LLM", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptSuccessResponse;

      expect(data.result.responseText.length).toBeGreaterThan(0);
    });
  });

  describe("Relationship validation", () => {
    it("should have promptExecutionId matching execution id", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptSuccessResponse;

      expect(data.result.promptExecutionId).toBe(data.execution.id);
    });
  });

  describe("Concurrent execution prevention", () => {
    it("should return 409 when execution is already in progress", async () => {
      executionStateCacheService.setCurrentExecution(
        "test-execution-id",
        "Test prompt text",
        new AbortController(),
      );

      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      expect(response.status).toBe(409);

      executionStateCacheService.clearCache();
    });

    it("should return error response with validation error type for concurrent execution", async () => {
      executionStateCacheService.setCurrentExecution(
        "test-execution-id",
        "Test prompt text",
        new AbortController(),
      );

      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data).toHaveProperty("execution");
      expect(data).toHaveProperty("error");
      expect(data.error.errorType).toBe("validation");
      expect(data.error.errorMessage).toContain("already in progress");

      executionStateCacheService.clearCache();
    });
  });
});

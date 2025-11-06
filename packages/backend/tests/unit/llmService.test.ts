import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateText } from "ai";

import { executePrompt, LLMExecutionError } from "@/services/llmService";

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn((model: string) => `openai:${model}`)),
}));

const mockGenerateText = vi.mocked(generateText);

describe("llmService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("executePrompt", () => {
    it("should successfully execute a prompt and return diagnostics", async () => {
      const mockResponse = {
        text: "This is a generated response",
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as never);

      const result = await executePrompt(
        "Test prompt",
        "sk-test-key",
        "gpt-4o-mini",
      );

      expect(result).toMatchObject({
        responseText: "This is a generated response",
        inputTokenCount: 10,
        outputTokenCount: 20,
        totalTokenCount: 30,
      });

      expect(result.executionDurationMs).toBeGreaterThanOrEqual(0);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it("should throw validation error when prompt text is empty", async () => {
      await expect(
        executePrompt("", "sk-test-key", "gpt-4o-mini"),
      ).rejects.toThrow(LLMExecutionError);

      await expect(
        executePrompt("", "sk-test-key", "gpt-4o-mini"),
      ).rejects.toMatchObject({
        errorType: "validation",
        message: "Prompt text cannot be empty",
      });
    });

    it("should throw validation error when prompt text is whitespace only", async () => {
      await expect(
        executePrompt("   ", "sk-test-key", "gpt-4o-mini"),
      ).rejects.toThrow(LLMExecutionError);

      await expect(
        executePrompt("   ", "sk-test-key", "gpt-4o-mini"),
      ).rejects.toMatchObject({
        errorType: "validation",
      });
    });

    it("should throw validation error when API key is empty", async () => {
      await expect(
        executePrompt("Test prompt", "", "gpt-4o-mini"),
      ).rejects.toThrow(LLMExecutionError);

      await expect(
        executePrompt("Test prompt", "", "gpt-4o-mini"),
      ).rejects.toMatchObject({
        errorType: "validation",
        message: "API key is required",
      });
    });

    it("should throw validation error when model is empty", async () => {
      await expect(
        executePrompt("Test prompt", "sk-test-key", ""),
      ).rejects.toThrow(LLMExecutionError);

      await expect(
        executePrompt("Test prompt", "sk-test-key", ""),
      ).rejects.toMatchObject({
        errorType: "validation",
      });
    });

    it("should throw authentication error when API key is invalid", async () => {
      mockGenerateText.mockRejectedValueOnce(
        new Error("Invalid API key provided"),
      );

      await expect(
        executePrompt("Test prompt", "invalid-key", "gpt-4o-mini"),
      ).rejects.toMatchObject({
        errorType: "authentication",
        errorCode: "invalid_api_key",
        message:
          "The API key provided is invalid. Please check your configuration.",
      });
    });

    it("should throw authentication error when unauthorized", async () => {
      mockGenerateText.mockRejectedValueOnce(new Error("Unauthorized access"));

      await expect(
        executePrompt("Test prompt", "bad-key", "gpt-4o-mini"),
      ).rejects.toMatchObject({
        errorType: "authentication",
        errorCode: "invalid_api_key",
      });
    });

    it("should throw rate_limit error when rate limited", async () => {
      mockGenerateText.mockRejectedValueOnce(
        new Error("Rate limit exceeded. Please try again later."),
      );

      await expect(
        executePrompt("Test prompt", "sk-test-key", "gpt-4o-mini"),
      ).rejects.toMatchObject({
        errorType: "rate_limit",
        errorCode: "rate_limit_exceeded",
        message: "Rate limit exceeded. Please try again later.",
      });
    });

    it("should throw rate_limit error on 429 status", async () => {
      mockGenerateText.mockRejectedValueOnce(
        new Error("HTTP 429: Too many requests"),
      );

      await expect(
        executePrompt("Test prompt", "sk-test-key", "gpt-4o-mini"),
      ).rejects.toMatchObject({
        errorType: "rate_limit",
        errorCode: "rate_limit_exceeded",
      });
    });

    it("should throw timeout error when request times out", async () => {
      mockGenerateText.mockRejectedValueOnce(
        new Error("Request timed out after 60 seconds"),
      );

      await expect(
        executePrompt("Test prompt", "sk-test-key", "gpt-4o-mini"),
      ).rejects.toMatchObject({
        errorType: "timeout",
        errorCode: "request_timeout",
        message: "The LLM request timed out.",
      });
    });

    it("should throw network error when connection fails", async () => {
      mockGenerateText.mockRejectedValueOnce(
        new Error("fetch failed: ECONNREFUSED"),
      );

      await expect(
        executePrompt("Test prompt", "sk-test-key", "gpt-4o-mini"),
      ).rejects.toMatchObject({
        errorType: "network",
        errorCode: "network_error",
        message:
          "Unable to connect to OpenAI API. Please check your internet connection.",
      });
    });

    it("should throw network error on network-related issues", async () => {
      mockGenerateText.mockRejectedValueOnce(
        new Error("Network error occurred"),
      );

      await expect(
        executePrompt("Test prompt", "sk-test-key", "gpt-4o-mini"),
      ).rejects.toMatchObject({
        errorType: "network",
        errorCode: "network_error",
      });
    });

    it("should throw api_error for unknown API errors", async () => {
      mockGenerateText.mockRejectedValueOnce(
        new Error("Something went wrong with the API"),
      );

      await expect(
        executePrompt("Test prompt", "sk-test-key", "gpt-4o-mini"),
      ).rejects.toMatchObject({
        errorType: "api_error",
        errorCode: "unknown_api_error",
      });
    });

    it("should throw unknown error for non-Error objects", async () => {
      mockGenerateText.mockRejectedValueOnce("String error");

      await expect(
        executePrompt("Test prompt", "sk-test-key", "gpt-4o-mini"),
      ).rejects.toMatchObject({
        errorType: "unknown",
      });
    });

    it("should include execution duration in error context", async () => {
      mockGenerateText.mockRejectedValueOnce(new Error("Some API error"));

      try {
        await executePrompt("Test prompt", "sk-test-key", "gpt-4o-mini");
      } catch (error) {
        expect(error).toBeInstanceOf(LLMExecutionError);
        if (error instanceof LLMExecutionError) {
          expect(error.additionalContext).toHaveProperty("executionDurationMs");
          expect(typeof error.additionalContext?.executionDurationMs).toBe(
            "number",
          );
        }
      }
    });

    it("should handle undefined usage tokens gracefully", async () => {
      const mockResponse = {
        text: "Response text",
        usage: {
          inputTokens: undefined,
          outputTokens: undefined,
          totalTokens: undefined,
        },
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as never);

      const result = await executePrompt(
        "Test prompt",
        "sk-test-key",
        "gpt-4o-mini",
      );

      expect(result).toMatchObject({
        responseText: "Response text",
        inputTokenCount: 0,
        outputTokenCount: 0,
        totalTokenCount: 0,
      });
    });

    it("should accept an optional abortSignal parameter", async () => {
      const mockResponse = {
        text: "Test response",
        usage: {
          inputTokens: 5,
          outputTokens: 10,
          totalTokens: 15,
        },
      };

      mockGenerateText.mockResolvedValueOnce(mockResponse as never);

      const abortController = new AbortController();
      const result = await executePrompt(
        "Test prompt",
        "sk-test-key",
        "gpt-4o-mini",
        abortController.signal,
      );

      expect(result).toMatchObject({
        responseText: "Test response",
        inputTokenCount: 5,
        outputTokenCount: 10,
        totalTokenCount: 15,
      });

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal: abortController.signal,
        }),
      );
    });

    it("should throw aborted error when execution is aborted via AbortError", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";

      mockGenerateText.mockRejectedValueOnce(abortError);

      const abortController = new AbortController();

      await expect(
        executePrompt(
          "Test prompt",
          "sk-test-key",
          "gpt-4o-mini",
          abortController.signal,
        ),
      ).rejects.toMatchObject({
        errorType: "aborted",
        errorCode: "execution_aborted",
        message: "Execution was cancelled by user",
      });
    });

    it("should throw aborted error when error message contains 'abort'", async () => {
      mockGenerateText.mockRejectedValueOnce(
        new Error("Request aborted by client"),
      );

      const abortController = new AbortController();

      await expect(
        executePrompt(
          "Test prompt",
          "sk-test-key",
          "gpt-4o-mini",
          abortController.signal,
        ),
      ).rejects.toMatchObject({
        errorType: "aborted",
        errorCode: "execution_aborted",
        message: "Execution was cancelled by user",
      });
    });

    it("should include execution duration in abort error context", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";

      mockGenerateText.mockRejectedValueOnce(abortError);

      const abortController = new AbortController();

      try {
        await executePrompt(
          "Test prompt",
          "sk-test-key",
          "gpt-4o-mini",
          abortController.signal,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(LLMExecutionError);
        if (error instanceof LLMExecutionError) {
          expect(error.additionalContext).toHaveProperty("executionDurationMs");
          expect(typeof error.additionalContext?.executionDurationMs).toBe(
            "number",
          );
          expect(error.errorType).toBe("aborted");
        }
      }
    });
  });
});

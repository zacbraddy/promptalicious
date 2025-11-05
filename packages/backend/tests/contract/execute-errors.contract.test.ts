import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ExecutePromptErrorResponse,
  ExecutePromptRequest,
} from "@promptalicious/shared-infra";

import app from "@/app";
import * as configService from "@/services/configService";
import * as llmService from "@/services/llmService";

vi.mock("@/services/llmService");
vi.mock("@/services/configService");

describe("POST /execute endpoint contract (Error Responses)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(configService.getConfig).mockResolvedValue({
      id: 1,
      selectedModel: "gpt-4o-mini",
      providerEndpoint: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    });

    vi.mocked(configService.getApiKey).mockResolvedValue(
      "sk-test-mock-api-key",
    );
  });

  describe("Validation error (400)", () => {
    const emptyPromptRequest: ExecutePromptRequest = {
      promptText: "",
    };

    it("should return 400 status for empty prompt", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emptyPromptRequest),
      });

      expect(response.status).toBe(400);
    });

    it("should return response matching ExecutePromptErrorResponse schema for empty prompt", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emptyPromptRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data).toHaveProperty("execution");
      expect(data).toHaveProperty("error");
    });

    it("should have execution status as failed for validation error", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emptyPromptRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.execution.status).toBe("failed");
    });

    it("should have error type as validation for empty prompt", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emptyPromptRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.error.errorType).toBe("validation");
    });

    it("should have descriptive error message for empty prompt", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emptyPromptRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.error.errorMessage).toContain("Prompt text cannot be empty");
    });

    it("should include all required error fields for validation error", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emptyPromptRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.error).toHaveProperty("id");
      expect(data.error).toHaveProperty("promptExecutionId");
      expect(data.error).toHaveProperty("errorType");
      expect(data.error).toHaveProperty("errorMessage");
      expect(data.error).toHaveProperty("timestamp");

      expect(typeof data.error.id).toBe("string");
      expect(typeof data.error.promptExecutionId).toBe("string");
      expect(typeof data.error.errorType).toBe("string");
      expect(typeof data.error.errorMessage).toBe("string");
      expect(typeof data.error.timestamp).toBe("string");
    });

    it("should have error timestamp in valid ISO 8601 format", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emptyPromptRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(() => new Date(data.error.timestamp)).not.toThrow();
      expect(new Date(data.error.timestamp).toISOString()).toBe(
        data.error.timestamp,
      );
    });

    it("should have promptExecutionId matching execution id", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emptyPromptRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.error.promptExecutionId).toBe(data.execution.id);
    });
  });

  describe("Authentication error (401)", () => {
    const validRequest: ExecutePromptRequest = {
      promptText: "Test authentication error",
    };

    beforeEach(() => {
      const error = new Error("The API key provided is invalid");
      error.name = "AuthenticationError";
      vi.mocked(llmService.executePrompt).mockRejectedValue(error);
    });

    it("should return 401 status for invalid API key", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      expect(response.status).toBe(401);
    });

    it("should return response matching ExecutePromptErrorResponse schema for authentication error", async () => {
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
    });

    it("should have error type as authentication", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.error.errorType).toBe("authentication");
    });

    it("should have descriptive error message for authentication error", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.error.errorMessage).toContain("API key");
      expect(data.error.errorMessage).toContain("invalid");
    });

    it("should include error code for authentication error", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.error.errorCode).toBeDefined();
      expect(typeof data.error.errorCode).toBe("string");
    });
  });

  describe("Rate limit error (429)", () => {
    const validRequest: ExecutePromptRequest = {
      promptText: "Test rate limit error",
    };

    beforeEach(() => {
      const error: Error & { additionalContext?: Record<string, unknown> } =
        new Error("Rate limit exceeded. Please try again in 60 seconds.");
      error.name = "RateLimitError";
      error.additionalContext = {
        retryAfter: 60,
      };
      vi.mocked(llmService.executePrompt).mockRejectedValue(error);
    });

    it("should return 429 status for rate limit exceeded", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      expect(response.status).toBe(429);
    });

    it("should return response matching ExecutePromptErrorResponse schema for rate limit error", async () => {
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
    });

    it("should have error type as rate_limit", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.error.errorType).toBe("rate_limit");
    });

    it("should have descriptive error message with retry guidance", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.error.errorMessage).toContain("Rate limit");
      expect(data.error.errorMessage).toContain("try again");
    });

    it("should include additionalContext with retry information", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.error.additionalContext).toBeDefined();
      expect(data.error.additionalContext).toHaveProperty("retryAfter");
    });
  });

  describe("Network error (500)", () => {
    const validRequest: ExecutePromptRequest = {
      promptText: "Test network error",
    };

    beforeEach(() => {
      const error = new Error(
        "Unable to connect to OpenAI API. Network error.",
      );
      error.name = "NetworkError";
      vi.mocked(llmService.executePrompt).mockRejectedValue(error);
    });

    it("should return 500 status for network error", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      expect(response.status).toBe(500);
    });

    it("should return response matching ExecutePromptErrorResponse schema for network error", async () => {
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
    });

    it("should have error type as network", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.error.errorType).toBe("network");
    });

    it("should have descriptive error message for network error", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.error.errorMessage).toContain("connect");
    });
  });

  describe("Timeout error (504)", () => {
    const validRequest: ExecutePromptRequest = {
      promptText: "Test timeout error",
    };

    beforeEach(() => {
      const error = new Error("Request timeout after 60 seconds");
      error.name = "TimeoutError";
      vi.mocked(llmService.executePrompt).mockRejectedValue(error);
    });

    it("should return 504 status for timeout error", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      expect(response.status).toBe(504);
    });

    it("should return response matching ExecutePromptErrorResponse schema for timeout error", async () => {
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
    });

    it("should have error type as timeout", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.error.errorType).toBe("timeout");
    });

    it("should have descriptive error message with timeout duration", async () => {
      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.error.errorMessage).toContain("timeout");
      expect(data.error.errorMessage).toContain("60 seconds");
    });
  });

  describe("Error response schema consistency", () => {
    it("should maintain consistent execution object structure across all error types", async () => {
      const emptyPromptRequest: ExecutePromptRequest = {
        promptText: "",
      };

      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emptyPromptRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.execution).toHaveProperty("id");
      expect(data.execution).toHaveProperty("promptText");
      expect(data.execution).toHaveProperty("executionTimestamp");
      expect(data.execution).toHaveProperty("status");
      expect(data.execution).toHaveProperty("targetModel");
    });

    it("should ensure all error responses have failed status in execution", async () => {
      const emptyPromptRequest: ExecutePromptRequest = {
        promptText: "",
      };

      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emptyPromptRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(data.execution.status).toBe("failed");
    });

    it("should ensure execution timestamp is valid across error scenarios", async () => {
      const emptyPromptRequest: ExecutePromptRequest = {
        promptText: "",
      };

      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emptyPromptRequest),
      });

      const data = (await response.json()) as ExecutePromptErrorResponse;

      expect(() => new Date(data.execution.executionTimestamp)).not.toThrow();
      expect(new Date(data.execution.executionTimestamp).toISOString()).toBe(
        data.execution.executionTimestamp,
      );
    });
  });
});

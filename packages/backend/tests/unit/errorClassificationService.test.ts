import { describe, it, expect } from "vitest";

import {
  classifyError,
  createExecutionError,
} from "@/services/errorClassificationService";

describe("errorClassificationService", () => {
  describe("classifyError", () => {
    describe("authentication errors", () => {
      it("should classify error with 'api key' in message as authentication error", () => {
        const error = new Error("Invalid api key provided");

        const result = classifyError(error);

        expect(result.errorType).toBe("authentication");
        expect(result.errorCode).toBe("invalid_api_key");
        expect(result.errorMessage).toBe(
          "The API key provided is invalid. Please check your configuration.",
        );
        expect(result.additionalContext).toEqual({
          originalError: "Invalid api key provided",
        });
      });

      it("should classify error with 'unauthorized' in message as authentication error", () => {
        const error = new Error("Unauthorized access");

        const result = classifyError(error);

        expect(result.errorType).toBe("authentication");
        expect(result.errorCode).toBe("invalid_api_key");
      });

      it("should classify error with 'invalid_api_key' in message as authentication error", () => {
        const error = new Error("Error: invalid_api_key - please check credentials");

        const result = classifyError(error);

        expect(result.errorType).toBe("authentication");
        expect(result.errorCode).toBe("invalid_api_key");
      });

      it("should classify error with '401' in message as authentication error", () => {
        const error = new Error("HTTP 401 error occurred");

        const result = classifyError(error);

        expect(result.errorType).toBe("authentication");
        expect(result.errorCode).toBe("invalid_api_key");
      });
    });

    describe("rate limit errors", () => {
      it("should classify error with 'rate limit' in message as rate_limit error", () => {
        const error = new Error("Rate limit exceeded");

        const result = classifyError(error);

        expect(result.errorType).toBe("rate_limit");
        expect(result.errorCode).toBe("rate_limit_exceeded");
        expect(result.errorMessage).toBe("Rate limit exceeded. Please try again later.");
        expect(result.additionalContext).toEqual({
          originalError: "Rate limit exceeded",
        });
      });

      it("should classify error with '429' in message as rate_limit error", () => {
        const error = new Error("HTTP 429 Too Many Requests");

        const result = classifyError(error);

        expect(result.errorType).toBe("rate_limit");
        expect(result.errorCode).toBe("rate_limit_exceeded");
      });
    });

    describe("timeout errors", () => {
      it("should classify error with 'timeout' in message as timeout error", () => {
        const error = new Error("Request timeout");

        const result = classifyError(error);

        expect(result.errorType).toBe("timeout");
        expect(result.errorCode).toBe("request_timeout");
        expect(result.errorMessage).toBe("The LLM request timed out.");
        expect(result.additionalContext).toEqual({
          originalError: "Request timeout",
        });
      });

      it("should classify error with 'timed out' in message as timeout error", () => {
        const error = new Error("Operation timed out after 60 seconds");

        const result = classifyError(error);

        expect(result.errorType).toBe("timeout");
        expect(result.errorCode).toBe("request_timeout");
      });

      it("should classify error with '504' in message as timeout error", () => {
        const error = new Error("HTTP 504 Gateway Timeout");

        const result = classifyError(error);

        expect(result.errorType).toBe("timeout");
        expect(result.errorCode).toBe("request_timeout");
      });
    });

    describe("network errors", () => {
      it("should classify error with 'network' in message as network error", () => {
        const error = new Error("Network error occurred");

        const result = classifyError(error);

        expect(result.errorType).toBe("network");
        expect(result.errorCode).toBe("network_error");
        expect(result.errorMessage).toBe(
          "Unable to connect to OpenAI API. Please check your internet connection.",
        );
        expect(result.additionalContext).toEqual({
          originalError: "Network error occurred",
        });
      });

      it("should classify error with 'fetch' in message as network error", () => {
        const error = new Error("fetch failed");

        const result = classifyError(error);

        expect(result.errorType).toBe("network");
        expect(result.errorCode).toBe("network_error");
      });

      it("should classify error with 'econnrefused' in message as network error", () => {
        const error = new Error("connect ECONNREFUSED 127.0.0.1:443");

        const result = classifyError(error);

        expect(result.errorType).toBe("network");
        expect(result.errorCode).toBe("network_error");
      });

      it("should classify error with 'enotfound' in message as network error", () => {
        const error = new Error("getaddrinfo ENOTFOUND api.openai.com");

        const result = classifyError(error);

        expect(result.errorType).toBe("network");
        expect(result.errorCode).toBe("network_error");
      });

      it("should classify error with 'connection' in message as network error", () => {
        const error = new Error("Connection refused by server");

        const result = classifyError(error);

        expect(result.errorType).toBe("network");
        expect(result.errorCode).toBe("network_error");
      });
    });

    describe("validation errors", () => {
      it("should classify error with 'validation' in message as validation error", () => {
        const error = new Error("Validation failed");

        const result = classifyError(error);

        expect(result.errorType).toBe("validation");
        expect(result.errorCode).toBe("validation_error");
        expect(result.errorMessage).toBe("Validation failed");
        expect(result.additionalContext).toEqual({
          originalError: "Validation failed",
        });
      });

      it("should classify error with 'invalid' in message as validation error", () => {
        const error = new Error("Invalid input provided");

        const result = classifyError(error);

        expect(result.errorType).toBe("validation");
        expect(result.errorCode).toBe("validation_error");
      });

      it("should classify error with 'required' in message as validation error", () => {
        const error = new Error("Field is required");

        const result = classifyError(error);

        expect(result.errorType).toBe("validation");
        expect(result.errorCode).toBe("validation_error");
      });
    });

    describe("api_error fallback for Error instances", () => {
      it("should classify unrecognised Error as api_error", () => {
        const error = new Error("Something went wrong with the API");

        const result = classifyError(error);

        expect(result.errorType).toBe("api_error");
        expect(result.errorCode).toBe("unknown_api_error");
        expect(result.errorMessage).toBe("Something went wrong with the API");
        expect(result.additionalContext).toEqual({
          originalError: "Something went wrong with the API",
        });
      });

      it("should handle Error with empty message", () => {
        const error = new Error("");

        const result = classifyError(error);

        expect(result.errorType).toBe("api_error");
        expect(result.errorCode).toBe("unknown_api_error");
        expect(result.errorMessage).toBe("An API error occurred");
      });
    });

    describe("unknown error fallback for non-Error types", () => {
      it("should classify string as unknown error", () => {
        const error = "Something bad happened";

        const result = classifyError(error);

        expect(result.errorType).toBe("unknown");
        expect(result.errorMessage).toBe("An unknown error occurred");
        expect(result.additionalContext).toEqual({
          originalError: "Something bad happened",
        });
      });

      it("should classify number as unknown error", () => {
        const error = 404;

        const result = classifyError(error);

        expect(result.errorType).toBe("unknown");
        expect(result.errorMessage).toBe("An unknown error occurred");
        expect(result.additionalContext).toEqual({
          originalError: "404",
        });
      });

      it("should classify null as unknown error", () => {
        const error = null;

        const result = classifyError(error);

        expect(result.errorType).toBe("unknown");
        expect(result.errorMessage).toBe("An unknown error occurred");
        expect(result.additionalContext).toEqual({
          originalError: "null",
        });
      });

      it("should classify undefined as unknown error", () => {
        const error = undefined;

        const result = classifyError(error);

        expect(result.errorType).toBe("unknown");
        expect(result.errorMessage).toBe("An unknown error occurred");
        expect(result.additionalContext).toEqual({
          originalError: "undefined",
        });
      });

      it("should classify object as unknown error", () => {
        const error = { code: 500, message: "Internal error" };

        const result = classifyError(error);

        expect(result.errorType).toBe("unknown");
        expect(result.errorMessage).toBe("An unknown error occurred");
        expect(result.additionalContext).toEqual({
          originalError: '[object Object]',
        });
      });
    });

    describe("case insensitivity", () => {
      it("should classify error with uppercase 'RATE LIMIT' in message", () => {
        const error = new Error("RATE LIMIT EXCEEDED");

        const result = classifyError(error);

        expect(result.errorType).toBe("rate_limit");
      });

      it("should classify error with mixed case 'Api Key' in message", () => {
        const error = new Error("Invalid Api Key provided");

        const result = classifyError(error);

        expect(result.errorType).toBe("authentication");
      });

      it("should classify error with uppercase 'TIMEOUT' in message", () => {
        const error = new Error("REQUEST TIMEOUT");

        const result = classifyError(error);

        expect(result.errorType).toBe("timeout");
      });
    });
  });

  describe("createExecutionError", () => {
    it("should create ExecutionError with all fields populated", () => {
      const promptExecutionId = "test-execution-id-123";
      const error = new Error("Rate limit exceeded");
      const stackTrace = "Error: Rate limit exceeded\n    at test.ts:10:5";

      const result = createExecutionError(promptExecutionId, error, stackTrace);

      expect(result.id).toBeDefined();
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(result.promptExecutionId).toBe(promptExecutionId);
      expect(result.errorType).toBe("rate_limit");
      expect(result.errorCode).toBe("rate_limit_exceeded");
      expect(result.errorMessage).toBe("Rate limit exceeded. Please try again later.");
      expect(result.stackTrace).toBe(stackTrace);
      expect(result.additionalContext).toEqual({
        originalError: "Rate limit exceeded",
      });
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).toString()).not.toBe("Invalid Date");
    });

    it("should create ExecutionError without stackTrace", () => {
      const promptExecutionId = "test-execution-id-456";
      const error = new Error("Network error");

      const result = createExecutionError(promptExecutionId, error);

      expect(result.id).toBeDefined();
      expect(result.promptExecutionId).toBe(promptExecutionId);
      expect(result.errorType).toBe("network");
      expect(result.stackTrace).toBeUndefined();
    });

    it("should generate unique IDs for different errors", () => {
      const promptExecutionId = "test-execution-id-789";
      const error1 = new Error("Error 1");
      const error2 = new Error("Error 2");

      const result1 = createExecutionError(promptExecutionId, error1);
      const result2 = createExecutionError(promptExecutionId, error2);

      expect(result1.id).not.toBe(result2.id);
    });

    it("should generate valid ISO 8601 timestamps", () => {
      const promptExecutionId = "test-execution-id-999";
      const error = new Error("Test error");

      const result = createExecutionError(promptExecutionId, error);

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      const parsedDate = new Date(result.timestamp);
      expect(parsedDate.toString()).not.toBe("Invalid Date");
      expect(parsedDate.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it("should preserve classified error information", () => {
      const promptExecutionId = "test-execution-id-111";
      const error = new Error("Invalid api key provided");

      const result = createExecutionError(promptExecutionId, error);

      expect(result.errorType).toBe("authentication");
      expect(result.errorCode).toBe("invalid_api_key");
      expect(result.errorMessage).toBe(
        "The API key provided is invalid. Please check your configuration.",
      );
    });

    it("should handle non-Error types", () => {
      const promptExecutionId = "test-execution-id-222";
      const error = "String error message";

      const result = createExecutionError(promptExecutionId, error);

      expect(result.errorType).toBe("unknown");
      expect(result.errorMessage).toBe("An unknown error occurred");
      expect(result.additionalContext).toEqual({
        originalError: "String error message",
      });
    });
  });
});

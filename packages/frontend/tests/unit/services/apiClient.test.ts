import { describe, it, expect, beforeEach, afterEach } from "vitest";
import MockAdapter from "axios-mock-adapter";
import type {
  ConfigurationResponse,
  UpdateConfigurationRequest,
  UpdateConfigurationSuccessResponse,
  TestConnectionResponse,
  ExecutePromptRequest,
  ExecutePromptSuccessResponse,
  ExecutePromptErrorResponse,
} from "@promptalicious/shared-infra";

import {
  apiClient,
  getConfig,
  updateConfig,
  testConnection,
  executePrompt,
  ApiError,
} from "@/services/apiClient";

describe("API Client", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient, { onNoMatch: "throwException" });
  });

  afterEach(() => {
    mock.restore();
  });

  describe("getConfig", () => {
    it("should fetch configuration successfully", async () => {
      const mockResponse: ConfigurationResponse = {
        config: {
          id: 1,
          selectedModel: "gpt-4o-mini",
          providerEndpoint: undefined,
          createdAt: "2025-11-04T09:00:00.000Z",
          updatedAt: "2025-11-04T09:00:00.000Z",
        },
        availableModels: ["gpt-4o-mini"],
      };

      mock.onGet("/config").reply(200, mockResponse);

      const result = await getConfig();
      expect(result).toEqual(mockResponse);
    });

    it("should throw ApiError on failure", async () => {
      mock.onGet("/config").reply(500, {
        error: { errorMessage: "Internal server error" },
      });

      await expect(getConfig()).rejects.toThrow(ApiError);
    });
  });

  describe("updateConfig", () => {
    it("should update configuration successfully", async () => {
      const requestData: UpdateConfigurationRequest = {
        apiKey: "sk-test-key",
        selectedModel: "gpt-4o-mini",
      };

      const mockResponse: UpdateConfigurationSuccessResponse = {
        config: {
          id: 1,
          selectedModel: "gpt-4o-mini",
          updatedAt: "2025-11-04T10:00:00.000Z",
          createdAt: "2025-11-04T09:00:00.000Z",
        },
        validationResult: {
          success: true,
          message: "API credentials validated successfully",
        },
      };

      mock.onPut("/config", requestData).reply(200, mockResponse);

      const result = await updateConfig(requestData);
      expect(result).toEqual(mockResponse);
    });

    it("should throw ApiError with validation error message", async () => {
      const requestData: UpdateConfigurationRequest = {
        apiKey: "invalid-key",
      };

      mock.onPut("/config", requestData).reply(400, {
        error: {
          errorType: "authentication",
          errorMessage: "API key validation failed: invalid credentials",
        },
      });

      await expect(updateConfig(requestData)).rejects.toThrow(ApiError);
      await expect(updateConfig(requestData)).rejects.toThrow(
        "API key validation failed: invalid credentials",
      );
    });
  });

  describe("testConnection", () => {
    it("should test connection successfully", async () => {
      const mockResponse: TestConnectionResponse = {
        success: true,
        message: "Successfully connected to OpenAI API with GPT-4o-mini",
      };

      mock.onPost("/config/test-connection").reply(200, mockResponse);

      const result = await testConnection();
      expect(result).toEqual(mockResponse);
    });

    it("should handle connection failure", async () => {
      const mockResponse: TestConnectionResponse = {
        success: false,
        message: "Connection failed: Invalid API key",
        error: {
          errorType: "authentication",
          errorCode: "invalid_api_key",
        },
      };

      mock.onPost("/config/test-connection").reply(200, mockResponse);

      const result = await testConnection();
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(false);
    });

    it("should throw ApiError on network error", async () => {
      mock.onPost("/config/test-connection").networkError();

      await expect(testConnection()).rejects.toThrow();
    });
  });

  describe("executePrompt", () => {
    it("should execute prompt successfully", async () => {
      const requestData: ExecutePromptRequest = {
        promptText: "You are a helpful assistant. Explain quantum computing.",
      };

      const mockResponse: ExecutePromptSuccessResponse = {
        execution: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          promptText: "You are a helpful assistant. Explain quantum computing.",
          executionTimestamp: "2025-11-04T10:30:00.000Z",
          status: "completed",
          targetModel: "gpt-4o-mini",
        },
        result: {
          id: "660e8400-e29b-41d4-a716-446655440001",
          promptExecutionId: "550e8400-e29b-41d4-a716-446655440000",
          responseText: "Quantum computing is a type of computing...",
          inputTokenCount: 15,
          outputTokenCount: 120,
          totalTokenCount: 135,
          executionDurationMs: 1842,
          estimatedCostGBP: 0.0012,
        },
      };

      mock.onPost("/execute", requestData).reply(200, mockResponse);

      const result = await executePrompt(requestData);
      expect(result).toEqual(mockResponse);
      expect(result.execution.status).toBe("completed");
      expect(result.result.responseText).toBe(
        "Quantum computing is a type of computing...",
      );
    });

    it("should throw ApiError on validation error (400)", async () => {
      const requestData: ExecutePromptRequest = {
        promptText: "",
      };

      const mockErrorResponse: ExecutePromptErrorResponse = {
        execution: {
          id: "770e8400-e29b-41d4-a716-446655440002",
          promptText: "",
          executionTimestamp: "2025-11-04T10:31:00.000Z",
          status: "failed",
          targetModel: "gpt-4o-mini",
        },
        error: {
          id: "880e8400-e29b-41d4-a716-446655440003",
          promptExecutionId: "770e8400-e29b-41d4-a716-446655440002",
          errorType: "validation",
          errorMessage: "Prompt text cannot be empty",
          timestamp: "2025-11-04T10:31:00.100Z",
        },
      };

      mock.onPost("/execute", requestData).reply(400, mockErrorResponse);

      await expect(executePrompt(requestData)).rejects.toThrow(ApiError);
      await expect(executePrompt(requestData)).rejects.toThrow(
        "Prompt text cannot be empty",
      );

      try {
        await executePrompt(requestData);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(400);
          expect(error.response).toEqual(mockErrorResponse);
        }
      }
    });

    it("should throw ApiError on authentication error (401)", async () => {
      const requestData: ExecutePromptRequest = {
        promptText: "Test prompt",
      };

      const mockErrorResponse: ExecutePromptErrorResponse = {
        execution: {
          id: "990e8400-e29b-41d4-a716-446655440004",
          promptText: "Test prompt",
          executionTimestamp: "2025-11-04T10:32:00.000Z",
          status: "failed",
          targetModel: "gpt-4o-mini",
        },
        error: {
          id: "aa0e8400-e29b-41d4-a716-446655440005",
          promptExecutionId: "990e8400-e29b-41d4-a716-446655440004",
          errorType: "authentication",
          errorCode: "invalid_api_key",
          errorMessage:
            "The API key provided is invalid. Please check your configuration.",
          timestamp: "2025-11-04T10:32:00.200Z",
        },
      };

      mock.onPost("/execute", requestData).reply(401, mockErrorResponse);

      await expect(executePrompt(requestData)).rejects.toThrow(
        "The API key provided is invalid. Please check your configuration.",
      );

      try {
        await executePrompt(requestData);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(401);
        }
      }
    });

    it("should throw ApiError on rate limit error (429)", async () => {
      const requestData: ExecutePromptRequest = {
        promptText: "Another prompt",
      };

      const mockErrorResponse: ExecutePromptErrorResponse = {
        execution: {
          id: "bb0e8400-e29b-41d4-a716-446655440006",
          promptText: "Another prompt",
          executionTimestamp: "2025-11-04T10:33:00.000Z",
          status: "failed",
          targetModel: "gpt-4o-mini",
        },
        error: {
          id: "cc0e8400-e29b-41d4-a716-446655440007",
          promptExecutionId: "bb0e8400-e29b-41d4-a716-446655440006",
          errorType: "rate_limit",
          errorCode: "rate_limit_exceeded",
          errorMessage: "Rate limit exceeded. Please try again in 60 seconds.",
          additionalContext: {
            retryAfter: 60,
          },
          timestamp: "2025-11-04T10:33:00.300Z",
        },
      };

      mock.onPost("/execute", requestData).reply(429, mockErrorResponse);

      await expect(executePrompt(requestData)).rejects.toThrow(
        "Rate limit exceeded. Please try again in 60 seconds.",
      );

      try {
        await executePrompt(requestData);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(429);
        }
      }
    });

    it("should throw ApiError on network error (500)", async () => {
      const requestData: ExecutePromptRequest = {
        promptText: "Yet another prompt",
      };

      const mockErrorResponse: ExecutePromptErrorResponse = {
        execution: {
          id: "dd0e8400-e29b-41d4-a716-446655440008",
          promptText: "Yet another prompt",
          executionTimestamp: "2025-11-04T10:34:00.000Z",
          status: "failed",
          targetModel: "gpt-4o-mini",
        },
        error: {
          id: "ee0e8400-e29b-41d4-a716-446655440009",
          promptExecutionId: "dd0e8400-e29b-41d4-a716-446655440008",
          errorType: "network",
          errorMessage:
            "Unable to connect to OpenAI API. Please check your internet connection.",
          timestamp: "2025-11-04T10:34:00.400Z",
        },
      };

      mock.onPost("/execute", requestData).reply(500, mockErrorResponse);

      await expect(executePrompt(requestData)).rejects.toThrow(
        "Unable to connect to OpenAI API. Please check your internet connection.",
      );
    });

    it("should throw ApiError on timeout error (504)", async () => {
      const requestData: ExecutePromptRequest = {
        promptText: "Timeout test prompt",
      };

      const mockErrorResponse: ExecutePromptErrorResponse = {
        execution: {
          id: "ff0e8400-e29b-41d4-a716-446655440010",
          promptText: "Timeout test prompt",
          executionTimestamp: "2025-11-04T10:35:00.000Z",
          status: "failed",
          targetModel: "gpt-4o-mini",
        },
        error: {
          id: "000e8400-e29b-41d4-a716-446655440011",
          promptExecutionId: "ff0e8400-e29b-41d4-a716-446655440010",
          errorType: "timeout",
          errorMessage: "The LLM request timed out after 60 seconds.",
          timestamp: "2025-11-04T10:36:00.000Z",
        },
      };

      mock.onPost("/execute", requestData).reply(504, mockErrorResponse);

      await expect(executePrompt(requestData)).rejects.toThrow(
        "The LLM request timed out after 60 seconds.",
      );
    });

    it("should handle network error without response", async () => {
      const requestData: ExecutePromptRequest = {
        promptText: "Network error test",
      };

      mock.onPost("/execute", requestData).networkError();

      await expect(executePrompt(requestData)).rejects.toThrow();
    });
  });

  describe("ApiError", () => {
    it("should create ApiError with all properties", () => {
      const error = new ApiError("Test error", 400, { some: "data" });

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ApiError");
      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(400);
      expect(error.response).toEqual({ some: "data" });
    });
  });
});

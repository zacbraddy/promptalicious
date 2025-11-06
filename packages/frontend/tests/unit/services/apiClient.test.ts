import { describe, it, expect, beforeEach, afterEach } from "vitest";
import MockAdapter from "axios-mock-adapter";
import type {
  ConfigurationResponse,
  UpdateConfigurationRequest,
  UpdateConfigurationSuccessResponse,
  TestConnectionResponse,
} from "@promptalicious/shared-infra";

import {
  apiClient,
  getConfig,
  updateConfig,
  testConnection,
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

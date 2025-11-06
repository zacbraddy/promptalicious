import { beforeEach, describe, expect, it } from "vitest";
import type { ExecutionStatusResponse } from "@promptalicious/shared-infra";

import app from "@/app";
import { executionStateCacheService } from "@/services/executionStateCacheService";

describe("GET /execute/status endpoint contract", () => {
  beforeEach(() => {
    executionStateCacheService.clearCache();
  });

  describe("No execution scenario", () => {
    it("should return 200 status when no execution exists", async () => {
      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      expect(response.status).toBe(200);
    });

    it("should return isExecuting false with null execution when no execution exists", async () => {
      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      const data = (await response.json()) as ExecutionStatusResponse;

      expect(data).toHaveProperty("isExecuting");
      expect(data).toHaveProperty("execution");
      expect(data.isExecuting).toBe(false);
      expect(data.execution).toBeNull();
    });

    it("should not include result or error fields when no execution exists", async () => {
      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      const data = (await response.json()) as ExecutionStatusResponse;

      expect(data).not.toHaveProperty("result");
      expect(data).not.toHaveProperty("error");
    });
  });

  describe("In-progress execution scenario", () => {
    it("should return 200 status when execution is in progress", async () => {
      executionStateCacheService.setCurrentExecution(
        "test-execution-id",
        "Test prompt text",
        "gpt-4o-mini",
        new AbortController(),
      );

      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      expect(response.status).toBe(200);

      executionStateCacheService.clearCache();
    });

    it("should return isExecuting true with execution details when in progress", async () => {
      const abortController = new AbortController();
      const testPrompt = "Test prompt for in-progress execution";

      executionStateCacheService.setCurrentExecution(
        "test-execution-id",
        testPrompt,
        "gpt-4o-mini",
        abortController,
      );

      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      const data = (await response.json()) as ExecutionStatusResponse;

      expect(data.isExecuting).toBe(true);
      expect(data.execution).not.toBeNull();
      expect(data.execution?.id).toBe("test-execution-id");
      expect(data.execution?.promptText).toBe(testPrompt);
      expect(data.execution?.status).toBe("in_progress");
      expect(data.execution?.targetModel).toBe("gpt-4o-mini");

      executionStateCacheService.clearCache();
    });

    it("should include valid timestamp in ISO 8601 format when in progress", async () => {
      executionStateCacheService.setCurrentExecution(
        "test-execution-id",
        "Test prompt",
        "gpt-4o-mini",
        new AbortController(),
      );

      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      const data = (await response.json()) as ExecutionStatusResponse;

      expect(data.execution?.executionTimestamp).toBeDefined();
      expect(() => new Date(data.execution!.executionTimestamp)).not.toThrow();
      expect(new Date(data.execution!.executionTimestamp).toISOString()).toBe(
        data.execution!.executionTimestamp,
      );

      executionStateCacheService.clearCache();
    });

    it("should not include result or error when execution is in progress", async () => {
      executionStateCacheService.setCurrentExecution(
        "test-execution-id",
        "Test prompt",
        "gpt-4o-mini",
        new AbortController(),
      );

      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      const data = (await response.json()) as ExecutionStatusResponse;

      expect(data.result).toBeUndefined();
      expect(data.error).toBeUndefined();

      executionStateCacheService.clearCache();
    });

    it("should NOT clear cache when execution is in progress", async () => {
      executionStateCacheService.setCurrentExecution(
        "test-execution-id",
        "Test prompt",
        "gpt-4o-mini",
        new AbortController(),
      );

      await app.request("/api/execute/status", {
        method: "GET",
      });

      const cacheAfter = executionStateCacheService.getCurrentExecution();
      expect(cacheAfter).not.toBeNull();
      expect(cacheAfter?.executionId).toBe("test-execution-id");

      executionStateCacheService.clearCache();
    });
  });

  describe("Completed execution scenario", () => {
    it("should return 200 status when execution is completed", async () => {
      executionStateCacheService.setCurrentExecution(
        "test-execution-id",
        "Test prompt",
        "gpt-4o-mini",
        new AbortController(),
      );

      executionStateCacheService.setExecutionResult({
        id: "result-id",
        promptExecutionId: "test-execution-id",
        responseText: "Test response",
        inputTokenCount: 10,
        outputTokenCount: 20,
        totalTokenCount: 30,
        executionDurationMs: 1500,
        estimatedCostGBP: 0.001,
      });

      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      expect(response.status).toBe(200);
    });

    it("should return isExecuting false with completed execution and result", async () => {
      executionStateCacheService.setCurrentExecution(
        "test-execution-id",
        "Test prompt",
        "gpt-4o-mini",
        new AbortController(),
      );

      const mockResult = {
        id: "result-id",
        promptExecutionId: "test-execution-id",
        responseText: "Test response",
        inputTokenCount: 10,
        outputTokenCount: 20,
        totalTokenCount: 30,
        executionDurationMs: 1500,
        estimatedCostGBP: 0.001,
      };

      executionStateCacheService.setExecutionResult(mockResult);

      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      const data = (await response.json()) as ExecutionStatusResponse;

      expect(data.isExecuting).toBe(false);
      expect(data.execution?.status).toBe("completed");
      expect(data.result).toEqual(mockResult);
      expect(data.error).toBeUndefined();
    });

    it("should clear cache after returning completed execution", async () => {
      executionStateCacheService.setCurrentExecution(
        "test-execution-id",
        "Test prompt",
        "gpt-4o-mini",
        new AbortController(),
      );

      executionStateCacheService.setExecutionResult({
        id: "result-id",
        promptExecutionId: "test-execution-id",
        responseText: "Test response",
        inputTokenCount: 10,
        outputTokenCount: 20,
        totalTokenCount: 30,
        executionDurationMs: 1500,
        estimatedCostGBP: 0.001,
      });

      await app.request("/api/execute/status", {
        method: "GET",
      });

      const cacheAfter = executionStateCacheService.getCurrentExecution();
      expect(cacheAfter).toBeNull();
    });
  });

  describe("Failed execution scenario", () => {
    it("should return 200 status when execution failed", async () => {
      executionStateCacheService.setCurrentExecution(
        "test-execution-id",
        "Test prompt",
        "gpt-4o-mini",
        new AbortController(),
      );

      executionStateCacheService.setExecutionResult({
        id: "error-id",
        promptExecutionId: "test-execution-id",
        errorType: "network",
        errorMessage: "Network error occurred",
        timestamp: new Date().toISOString(),
      });

      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      expect(response.status).toBe(200);
    });

    it("should return isExecuting false with failed execution and error", async () => {
      executionStateCacheService.setCurrentExecution(
        "test-execution-id",
        "Test prompt",
        "gpt-4o-mini",
        new AbortController(),
      );

      const mockError = {
        id: "error-id",
        promptExecutionId: "test-execution-id",
        errorType: "network" as const,
        errorMessage: "Network error occurred",
        timestamp: new Date().toISOString(),
      };

      executionStateCacheService.setExecutionResult(mockError);

      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      const data = (await response.json()) as ExecutionStatusResponse;

      expect(data.isExecuting).toBe(false);
      expect(data.execution?.status).toBe("failed");
      expect(data.error).toEqual(mockError);
      expect(data.result).toBeUndefined();
    });

    it("should clear cache after returning failed execution", async () => {
      executionStateCacheService.setCurrentExecution(
        "test-execution-id",
        "Test prompt",
        "gpt-4o-mini",
        new AbortController(),
      );

      executionStateCacheService.setExecutionResult({
        id: "error-id",
        promptExecutionId: "test-execution-id",
        errorType: "network",
        errorMessage: "Network error occurred",
        timestamp: new Date().toISOString(),
      });

      await app.request("/api/execute/status", {
        method: "GET",
      });

      const cacheAfter = executionStateCacheService.getCurrentExecution();
      expect(cacheAfter).toBeNull();
    });
  });

  describe("ExecutionStatusResponse schema validation", () => {
    it("should match ExecutionStatusResponse schema structure", async () => {
      executionStateCacheService.setCurrentExecution(
        "test-execution-id",
        "Test prompt",
        "gpt-4o-mini",
        new AbortController(),
      );

      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      const data = (await response.json()) as ExecutionStatusResponse;

      expect(data).toHaveProperty("isExecuting");
      expect(data).toHaveProperty("execution");
      expect(typeof data.isExecuting).toBe("boolean");

      executionStateCacheService.clearCache();
    });
  });
});

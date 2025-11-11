import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecutionStatusResponse } from "@promptalicious/shared-infra";

import app from "@/app";
import * as executionStateCacheService from "@/services/execution-state-cache.service";

vi.mock("@/services/execution-state-cache.service", () => ({
  executionStateCacheService: {
    getCurrentExecution: vi.fn(),
    clearCache: vi.fn(),
  },
}));

describe("GET /execute/status endpoint contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("No execution scenario", () => {
    it("should return 200 status when no execution exists", async () => {
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .getCurrentExecution,
      ).mockReturnValue(null);

      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      expect(response.status).toBe(200);
    });

    it("should return isExecuting false with null execution when no execution exists", async () => {
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .getCurrentExecution,
      ).mockReturnValue(null);

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
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .getCurrentExecution,
      ).mockReturnValue(null);

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
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .getCurrentExecution,
      ).mockReturnValue({
        executionId: "test-execution-id",
        promptText: "Test prompt text",
        targetModel: "gpt-4o-mini",
        startTimestamp: new Date("2025-01-01T10:00:00.000Z"),
        abortController: new AbortController(),
        status: "in_progress",
      });

      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      expect(response.status).toBe(200);
    });

    it("should return isExecuting true with execution details when in progress", async () => {
      const testPrompt = "Test prompt for in-progress execution";

      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .getCurrentExecution,
      ).mockReturnValue({
        executionId: "test-execution-id",
        promptText: testPrompt,
        targetModel: "gpt-4o-mini",
        startTimestamp: new Date("2025-01-01T10:00:00.000Z"),
        abortController: new AbortController(),
        status: "in_progress",
      });

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
    });

    it("should include valid timestamp in ISO 8601 format when in progress", async () => {
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .getCurrentExecution,
      ).mockReturnValue({
        executionId: "test-execution-id",
        promptText: "Test prompt",
        targetModel: "gpt-4o-mini",
        startTimestamp: new Date("2025-01-01T10:00:00.000Z"),
        abortController: new AbortController(),
        status: "in_progress",
      });

      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      const data = (await response.json()) as ExecutionStatusResponse;

      expect(data.execution?.executionTimestamp).toBeDefined();
      expect(() => new Date(data.execution!.executionTimestamp)).not.toThrow();
      expect(new Date(data.execution!.executionTimestamp).toISOString()).toBe(
        data.execution!.executionTimestamp,
      );
    });

    it("should not include result or error when execution is in progress", async () => {
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .getCurrentExecution,
      ).mockReturnValue({
        executionId: "test-execution-id",
        promptText: "Test prompt",
        targetModel: "gpt-4o-mini",
        startTimestamp: new Date("2025-01-01T10:00:00.000Z"),
        abortController: new AbortController(),
        status: "in_progress",
      });

      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      const data = (await response.json()) as ExecutionStatusResponse;

      expect(data.result).toBeUndefined();
      expect(data.error).toBeUndefined();
    });

    it("should NOT clear cache when execution is in progress", async () => {
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .getCurrentExecution,
      ).mockReturnValue({
        executionId: "test-execution-id",
        promptText: "Test prompt",
        targetModel: "gpt-4o-mini",
        startTimestamp: new Date("2025-01-01T10:00:00.000Z"),
        abortController: new AbortController(),
        status: "in_progress",
      });

      await app.request("/api/execute/status", {
        method: "GET",
      });

      expect(
        executionStateCacheService.executionStateCacheService.clearCache,
      ).not.toHaveBeenCalled();
    });
  });

  describe("Completed execution scenario", () => {
    it("should return 200 status when execution is completed", async () => {
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

      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .getCurrentExecution,
      ).mockReturnValue({
        executionId: "test-execution-id",
        promptText: "Test prompt",
        targetModel: "gpt-4o-mini",
        startTimestamp: new Date("2025-01-01T10:00:00.000Z"),
        abortController: new AbortController(),
        status: "completed",
        result: mockResult,
      });

      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      expect(response.status).toBe(200);
    });

    it("should return isExecuting false with completed execution and result", async () => {
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

      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .getCurrentExecution,
      ).mockReturnValue({
        executionId: "test-execution-id",
        promptText: "Test prompt",
        targetModel: "gpt-4o-mini",
        startTimestamp: new Date("2025-01-01T10:00:00.000Z"),
        abortController: new AbortController(),
        status: "completed",
        result: mockResult,
      });

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

      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .getCurrentExecution,
      ).mockReturnValue({
        executionId: "test-execution-id",
        promptText: "Test prompt",
        targetModel: "gpt-4o-mini",
        startTimestamp: new Date("2025-01-01T10:00:00.000Z"),
        abortController: new AbortController(),
        status: "completed",
        result: mockResult,
      });

      await app.request("/api/execute/status", {
        method: "GET",
      });

      expect(
        executionStateCacheService.executionStateCacheService.clearCache,
      ).toHaveBeenCalledOnce();
    });
  });

  describe("Failed execution scenario", () => {
    it("should return 200 status when execution failed", async () => {
      const mockError = {
        id: "error-id",
        promptExecutionId: "test-execution-id",
        errorType: "network" as const,
        errorMessage: "Network error occurred",
        timestamp: new Date().toISOString(),
      };

      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .getCurrentExecution,
      ).mockReturnValue({
        executionId: "test-execution-id",
        promptText: "Test prompt",
        targetModel: "gpt-4o-mini",
        startTimestamp: new Date("2025-01-01T10:00:00.000Z"),
        abortController: new AbortController(),
        status: "failed",
        error: mockError,
      });

      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      expect(response.status).toBe(200);
    });

    it("should return isExecuting false with failed execution and error", async () => {
      const mockError = {
        id: "error-id",
        promptExecutionId: "test-execution-id",
        errorType: "network" as const,
        errorMessage: "Network error occurred",
        timestamp: new Date().toISOString(),
      };

      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .getCurrentExecution,
      ).mockReturnValue({
        executionId: "test-execution-id",
        promptText: "Test prompt",
        targetModel: "gpt-4o-mini",
        startTimestamp: new Date("2025-01-01T10:00:00.000Z"),
        abortController: new AbortController(),
        status: "failed",
        error: mockError,
      });

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
      const mockError = {
        id: "error-id",
        promptExecutionId: "test-execution-id",
        errorType: "network" as const,
        errorMessage: "Network error occurred",
        timestamp: new Date().toISOString(),
      };

      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .getCurrentExecution,
      ).mockReturnValue({
        executionId: "test-execution-id",
        promptText: "Test prompt",
        targetModel: "gpt-4o-mini",
        startTimestamp: new Date("2025-01-01T10:00:00.000Z"),
        abortController: new AbortController(),
        status: "failed",
        error: mockError,
      });

      await app.request("/api/execute/status", {
        method: "GET",
      });

      expect(
        executionStateCacheService.executionStateCacheService.clearCache,
      ).toHaveBeenCalledOnce();
    });
  });

  describe("ExecutionStatusResponse schema validation", () => {
    it("should match ExecutionStatusResponse schema structure", async () => {
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .getCurrentExecution,
      ).mockReturnValue({
        executionId: "test-execution-id",
        promptText: "Test prompt",
        targetModel: "gpt-4o-mini",
        startTimestamp: new Date("2025-01-01T10:00:00.000Z"),
        abortController: new AbortController(),
        status: "in_progress",
      });

      const response = await app.request("/api/execute/status", {
        method: "GET",
      });

      const data = (await response.json()) as ExecutionStatusResponse;

      expect(data).toHaveProperty("isExecuting");
      expect(data).toHaveProperty("execution");
      expect(typeof data.isExecuting).toBe("boolean");
    });
  });
});

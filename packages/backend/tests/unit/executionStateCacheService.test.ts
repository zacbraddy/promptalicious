import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  ExecutionResult,
  ExecutionError,
} from "@promptalicious/shared-infra";

import { executionStateCacheService } from "@/services/executionStateCacheService";

describe("executionStateCacheService", () => {
  beforeEach(() => {
    executionStateCacheService.clearCache();
  });

  describe("setCurrentExecution", () => {
    it("should store execution state with all required fields", () => {
      const executionId = "test-execution-123";
      const promptText = "Test prompt text";
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        executionId,
        promptText,
        "gpt-4o-mini",
        abortController,
      );

      const state = executionStateCacheService.getCurrentExecution();

      expect(state).not.toBeNull();
      expect(state?.executionId).toBe(executionId);
      expect(state?.promptText).toBe(promptText);
      expect(state?.abortController).toBe(abortController);
      expect(state?.status).toBe("in_progress");
      expect(state?.startTimestamp).toBeInstanceOf(Date);
    });

    it("should replace previous execution when called multiple times", () => {
      const firstExecutionId = "execution-1";
      const secondExecutionId = "execution-2";
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        firstExecutionId,
        "First prompt",
        "gpt-4o-mini",
        abortController,
      );

      executionStateCacheService.setCurrentExecution(
        secondExecutionId,
        "Second prompt",
        "gpt-4o-mini",
        abortController,
      );

      const state = executionStateCacheService.getCurrentExecution();

      expect(state?.executionId).toBe(secondExecutionId);
      expect(state?.promptText).toBe("Second prompt");
    });

    it("should create new timestamp for each execution", () => {
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        "execution-1",
        "First prompt",
        "gpt-4o-mini",
        abortController,
      );

      const firstTimestamp =
        executionStateCacheService.getCurrentExecution()?.startTimestamp;

      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);

      executionStateCacheService.setCurrentExecution(
        "execution-2",
        "Second prompt",
        "gpt-4o-mini",
        abortController,
      );

      const secondTimestamp =
        executionStateCacheService.getCurrentExecution()?.startTimestamp;

      expect(secondTimestamp).not.toEqual(firstTimestamp);

      vi.useRealTimers();
    });
  });

  describe("setExecutionResult", () => {
    it("should store successful execution result", () => {
      const executionId = "test-execution-123";
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        executionId,
        "Test prompt",
        "gpt-4o-mini",
        abortController,
      );

      const result: ExecutionResult = {
        id: "result-123",
        promptExecutionId: "test-execution-123",
        responseText: "Test response",
        inputTokenCount: 10,
        outputTokenCount: 20,
        totalTokenCount: 30,
        executionDurationMs: 1500,
        estimatedCostGBP: 0.05,
      };

      executionStateCacheService.setExecutionResult(result);

      const state = executionStateCacheService.getCurrentExecution();

      expect(state?.result).toEqual(result);
      expect(state?.error).toBeUndefined();
    });

    it("should store error execution result", () => {
      const executionId = "test-execution-123";
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        executionId,
        "Test prompt",
        "gpt-4o-mini",
        abortController,
      );

      const error: ExecutionError = {
        id: "error-123",
        promptExecutionId: "test-execution-123",
        errorType: "authentication",
        errorMessage: "Invalid API key",
        errorCode: "invalid_api_key",
        timestamp: new Date().toISOString(),
      };

      executionStateCacheService.setExecutionResult(error);

      const state = executionStateCacheService.getCurrentExecution();

      expect(state?.error).toEqual(error);
      expect(state?.result).toBeUndefined();
    });

    it("should throw error when no execution is in progress", () => {
      const result: ExecutionResult = {
        id: "result-123",
        promptExecutionId: "test-execution-123",
        responseText: "Test response",
        inputTokenCount: 10,
        outputTokenCount: 20,
        totalTokenCount: 30,
        executionDurationMs: 1500,
        estimatedCostGBP: 0.05,
      };

      expect(() => {
        executionStateCacheService.setExecutionResult(result);
      }).toThrow("Cannot set execution result: no execution in progress");
    });

    it("should keep execution state when storing result", () => {
      const executionId = "test-execution-123";
      const promptText = "Test prompt";
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        executionId,
        promptText,
        "gpt-4o-mini",
        abortController,
      );

      const result: ExecutionResult = {
        id: "result-123",
        promptExecutionId: "test-execution-123",
        responseText: "Test response",
        inputTokenCount: 10,
        outputTokenCount: 20,
        totalTokenCount: 30,
        executionDurationMs: 1500,
        estimatedCostGBP: 0.05,
      };

      executionStateCacheService.setExecutionResult(result);

      const state = executionStateCacheService.getCurrentExecution();

      expect(state?.executionId).toBe(executionId);
      expect(state?.promptText).toBe(promptText);
      expect(state?.abortController).toBe(abortController);
      expect(state?.status).toBe("completed");
    });

    it("should transition status to completed when storing successful result", () => {
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        "test-execution-123",
        "Test prompt",
        "gpt-4o-mini",
        abortController,
      );

      expect(executionStateCacheService.getCurrentExecution()?.status).toBe(
        "in_progress",
      );

      const result: ExecutionResult = {
        id: "result-123",
        promptExecutionId: "test-execution-123",
        responseText: "Test response",
        inputTokenCount: 10,
        outputTokenCount: 20,
        totalTokenCount: 30,
        executionDurationMs: 1500,
        estimatedCostGBP: 0.05,
      };

      executionStateCacheService.setExecutionResult(result);

      expect(executionStateCacheService.getCurrentExecution()?.status).toBe(
        "completed",
      );
    });

    it("should transition status to failed when storing error result", () => {
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        "test-execution-123",
        "Test prompt",
        "gpt-4o-mini",
        abortController,
      );

      expect(executionStateCacheService.getCurrentExecution()?.status).toBe(
        "in_progress",
      );

      const error: ExecutionError = {
        id: "error-123",
        promptExecutionId: "test-execution-123",
        errorType: "authentication",
        errorMessage: "Invalid API key",
        errorCode: "invalid_api_key",
        timestamp: new Date().toISOString(),
      };

      executionStateCacheService.setExecutionResult(error);

      expect(executionStateCacheService.getCurrentExecution()?.status).toBe(
        "failed",
      );
    });
  });

  describe("getCurrentExecution", () => {
    it("should return null when no execution is stored", () => {
      const state = executionStateCacheService.getCurrentExecution();

      expect(state).toBeNull();
    });

    it("should return execution state when execution is in progress", () => {
      const executionId = "test-execution-123";
      const promptText = "Test prompt";
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        executionId,
        promptText,
        "gpt-4o-mini",
        abortController,
      );

      const state = executionStateCacheService.getCurrentExecution();

      expect(state).not.toBeNull();
      expect(state?.executionId).toBe(executionId);
    });

    it("should return execution state with result when execution completed", () => {
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        "test-execution-123",
        "Test prompt",
        "gpt-4o-mini",
        abortController,
      );

      const result: ExecutionResult = {
        id: "result-123",
        promptExecutionId: "test-execution-123",
        responseText: "Test response",
        inputTokenCount: 10,
        outputTokenCount: 20,
        totalTokenCount: 30,
        executionDurationMs: 1500,
        estimatedCostGBP: 0.05,
      };

      executionStateCacheService.setExecutionResult(result);

      const state = executionStateCacheService.getCurrentExecution();

      expect(state?.result).toEqual(result);
    });
  });

  describe("clearCache", () => {
    it("should clear execution state", () => {
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        "test-execution-123",
        "Test prompt",
        "gpt-4o-mini",
        abortController,
      );

      executionStateCacheService.clearCache();

      const state = executionStateCacheService.getCurrentExecution();

      expect(state).toBeNull();
    });

    it("should allow new execution after clearing cache", () => {
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        "first-execution",
        "First prompt",
        "gpt-4o-mini",
        abortController,
      );

      executionStateCacheService.clearCache();

      executionStateCacheService.setCurrentExecution(
        "second-execution",
        "Second prompt",
        "gpt-4o-mini",
        abortController,
      );

      const state = executionStateCacheService.getCurrentExecution();

      expect(state?.executionId).toBe("second-execution");
    });

    it("should be safe to call multiple times", () => {
      executionStateCacheService.clearCache();
      executionStateCacheService.clearCache();

      const state = executionStateCacheService.getCurrentExecution();

      expect(state).toBeNull();
    });
  });

  describe("abortCurrentExecution", () => {
    it("should abort current execution and return true", () => {
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        "test-execution-123",
        "Test prompt",
        "gpt-4o-mini",
        abortController,
      );

      const result = executionStateCacheService.abortCurrentExecution();

      expect(result).toBe(true);
      expect(abortController.signal.aborted).toBe(true);
    });

    it("should return false when no execution is in progress", () => {
      const result = executionStateCacheService.abortCurrentExecution();

      expect(result).toBe(false);
    });

    it("should not clear execution state after aborting", () => {
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        "test-execution-123",
        "Test prompt",
        "gpt-4o-mini",
        abortController,
      );

      executionStateCacheService.abortCurrentExecution();

      const state = executionStateCacheService.getCurrentExecution();

      expect(state).not.toBeNull();
      expect(state?.executionId).toBe("test-execution-123");
    });

    it("should allow storing result after abort", () => {
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        "test-execution-123",
        "Test prompt",
        "gpt-4o-mini",
        abortController,
      );

      executionStateCacheService.abortCurrentExecution();

      const error: ExecutionError = {
        id: "error-123",
        promptExecutionId: "test-execution-123",
        errorType: "unknown",
        errorMessage: "Execution aborted by user",
        timestamp: new Date().toISOString(),
      };

      executionStateCacheService.setExecutionResult(error);

      const state = executionStateCacheService.getCurrentExecution();

      expect(state?.error).toEqual(error);
    });
  });

  describe("lifecycle integration", () => {
    it("should support full execution lifecycle: start → result → clear", () => {
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        "test-execution-123",
        "Test prompt",
        "gpt-4o-mini",
        abortController,
      );

      expect(executionStateCacheService.getCurrentExecution()).not.toBeNull();

      const result: ExecutionResult = {
        id: "result-123",
        promptExecutionId: "test-execution-123",
        responseText: "Test response",
        inputTokenCount: 10,
        outputTokenCount: 20,
        totalTokenCount: 30,
        executionDurationMs: 1500,
        estimatedCostGBP: 0.05,
      };

      executionStateCacheService.setExecutionResult(result);

      expect(executionStateCacheService.getCurrentExecution()?.result).toEqual(
        result,
      );

      executionStateCacheService.clearCache();

      expect(executionStateCacheService.getCurrentExecution()).toBeNull();
    });

    it("should support abort lifecycle: start → abort → error → clear", () => {
      const abortController = new AbortController();

      executionStateCacheService.setCurrentExecution(
        "test-execution-123",
        "Test prompt",
        "gpt-4o-mini",
        abortController,
      );

      const aborted = executionStateCacheService.abortCurrentExecution();

      expect(aborted).toBe(true);

      const error: ExecutionError = {
        id: "error-123",
        promptExecutionId: "test-execution-123",
        errorType: "unknown",
        errorMessage: "Aborted",
        timestamp: new Date().toISOString(),
      };

      executionStateCacheService.setExecutionResult(error);

      expect(executionStateCacheService.getCurrentExecution()?.error).toEqual(
        error,
      );

      executionStateCacheService.clearCache();

      expect(executionStateCacheService.getCurrentExecution()).toBeNull();
    });
  });
});

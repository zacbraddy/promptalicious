import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AbortExecutionResponse } from "@promptalicious/shared-infra";

import app from "@/app";
import * as executionStateCacheService from "@/services/executionStateCacheService";

vi.mock("@/services/executionStateCacheService", () => ({
  executionStateCacheService: {
    abortCurrentExecution: vi.fn(),
  },
}));

describe("POST /execute/abort endpoint contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Abort success scenario", () => {
    it("should return 200 status when aborting execution in progress", async () => {
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .abortCurrentExecution,
      ).mockReturnValue(true);

      const response = await app.request("/api/execute/abort", {
        method: "POST",
      });

      expect(response.status).toBe(200);
    });

    it("should return success true with message when aborting execution", async () => {
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .abortCurrentExecution,
      ).mockReturnValue(true);

      const response = await app.request("/api/execute/abort", {
        method: "POST",
      });

      const data = (await response.json()) as AbortExecutionResponse;

      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("message");
      expect(data.success).toBe(true);
      expect(data.message).toBe("Execution aborted successfully");
    });

    it("should not include error field on successful abort", async () => {
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .abortCurrentExecution,
      ).mockReturnValue(true);

      const response = await app.request("/api/execute/abort", {
        method: "POST",
      });

      const data = (await response.json()) as AbortExecutionResponse;

      expect(data).not.toHaveProperty("error");
    });

    it("should call abortCurrentExecution service method", async () => {
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .abortCurrentExecution,
      ).mockReturnValue(true);

      await app.request("/api/execute/abort", {
        method: "POST",
      });

      expect(
        executionStateCacheService.executionStateCacheService
          .abortCurrentExecution,
      ).toHaveBeenCalledOnce();
    });
  });

  describe("No execution scenario", () => {
    it("should return 400 status when no execution in progress", async () => {
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .abortCurrentExecution,
      ).mockReturnValue(false);

      const response = await app.request("/api/execute/abort", {
        method: "POST",
      });

      expect(response.status).toBe(400);
    });

    it("should return success false with error details when no execution", async () => {
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .abortCurrentExecution,
      ).mockReturnValue(false);

      const response = await app.request("/api/execute/abort", {
        method: "POST",
      });

      const data = (await response.json()) as AbortExecutionResponse;

      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("error");
      expect(data.success).toBe(false);
      expect(data.message).toBe("No execution in progress to abort");
      expect(data.error).toHaveProperty("errorType");
      expect(data.error).toHaveProperty("errorMessage");
      expect(data.error?.errorType).toBe("validation");
      expect(data.error?.errorMessage).toBe(
        "No execution is currently in progress",
      );
    });

    it("should match AbortExecutionResponse error schema structure", async () => {
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .abortCurrentExecution,
      ).mockReturnValue(false);

      const response = await app.request("/api/execute/abort", {
        method: "POST",
      });

      const data = (await response.json()) as AbortExecutionResponse;

      expect(typeof data.success).toBe("boolean");
      expect(typeof data.message).toBe("string");
      expect(typeof data.error).toBe("object");
      expect(typeof data.error?.errorType).toBe("string");
      expect(typeof data.error?.errorMessage).toBe("string");
    });
  });

  describe("AbortExecutionResponse schema validation", () => {
    it("should match AbortExecutionResponse success schema structure", async () => {
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .abortCurrentExecution,
      ).mockReturnValue(true);

      const response = await app.request("/api/execute/abort", {
        method: "POST",
      });

      const data = (await response.json()) as AbortExecutionResponse;

      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("message");
      expect(typeof data.success).toBe("boolean");
      expect(typeof data.message).toBe("string");
    });

    it("should ensure success response has no error field", async () => {
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .abortCurrentExecution,
      ).mockReturnValue(true);

      const response = await app.request("/api/execute/abort", {
        method: "POST",
      });

      const data = (await response.json()) as AbortExecutionResponse;

      expect(data.error).toBeUndefined();
    });

    it("should ensure error response includes all required error fields", async () => {
      vi.mocked(
        executionStateCacheService.executionStateCacheService
          .abortCurrentExecution,
      ).mockReturnValue(false);

      const response = await app.request("/api/execute/abort", {
        method: "POST",
      });

      const data = (await response.json()) as AbortExecutionResponse;

      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error?.errorType).toBeDefined();
      expect(data.error?.errorMessage).toBeDefined();
    });
  });
});

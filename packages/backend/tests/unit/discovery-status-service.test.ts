import { describe, it, expect, beforeEach } from "vitest";

import * as discoveryStatusService from "@/services/discovery-status-service";

describe("discoveryStatusService", () => {
  beforeEach(() => {
    discoveryStatusService.resetState();
  });

  describe("initial state", () => {
    it("should initialize with idle phase", () => {
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.isDiscovering).toBe(false);
      expect(status.phase).toBe("idle");
    });

    it("should initialize with empty logs", () => {
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.logs).toEqual([]);
    });

    it("should initialize with zero counters", () => {
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.progress).toEqual({
        filesScanned: 0,
        filesAnalyzed: 0,
        toolsFound: 0,
        filesGenerated: 0,
      });
    });
  });

  describe("startDiscovery", () => {
    it("should set isDiscovering to true", () => {
      discoveryStatusService.startDiscovery();
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.isDiscovering).toBe(true);
    });

    it("should set phase to scanning", () => {
      discoveryStatusService.startDiscovery();
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.phase).toBe("scanning");
    });

    it("should reset logs when starting new discovery", () => {
      discoveryStatusService.appendLog({
        level: "info",
        phase: "scanning",
        message: "Old log",
      });

      discoveryStatusService.startDiscovery();
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.logs).toEqual([]);
    });

    it("should reset progress counters when starting new discovery", () => {
      discoveryStatusService.incrementCounters({ filesScanned: 10 });

      discoveryStatusService.startDiscovery();
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.progress).toEqual({
        filesScanned: 0,
        filesAnalyzed: 0,
        toolsFound: 0,
        filesGenerated: 0,
      });
    });
  });

  describe("updatePhase", () => {
    it("should update phase from scanning to analyzing", () => {
      discoveryStatusService.startDiscovery();
      discoveryStatusService.updatePhase("analyzing");
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.phase).toBe("analyzing");
    });

    it("should update phase from analyzing to generating", () => {
      discoveryStatusService.startDiscovery();
      discoveryStatusService.updatePhase("generating");
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.phase).toBe("generating");
    });

    it("should update phase to complete", () => {
      discoveryStatusService.startDiscovery();
      discoveryStatusService.updatePhase("complete");
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.phase).toBe("complete");
    });

    it("should update phase to error", () => {
      discoveryStatusService.startDiscovery();
      discoveryStatusService.updatePhase("error");
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.phase).toBe("error");
    });
  });

  describe("incrementCounters", () => {
    beforeEach(() => {
      discoveryStatusService.startDiscovery();
    });

    it("should increment filesScanned counter", () => {
      discoveryStatusService.incrementCounters({ filesScanned: 5 });
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.progress.filesScanned).toBe(5);
    });

    it("should increment filesAnalyzed counter", () => {
      discoveryStatusService.incrementCounters({ filesAnalyzed: 3 });
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.progress.filesAnalyzed).toBe(3);
    });

    it("should increment toolsFound counter", () => {
      discoveryStatusService.incrementCounters({ toolsFound: 2 });
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.progress.toolsFound).toBe(2);
    });

    it("should increment filesGenerated counter", () => {
      discoveryStatusService.incrementCounters({ filesGenerated: 10 });
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.progress.filesGenerated).toBe(10);
    });

    it("should increment multiple counters at once", () => {
      discoveryStatusService.incrementCounters({
        filesScanned: 5,
        filesAnalyzed: 3,
        toolsFound: 2,
      });
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.progress).toEqual({
        filesScanned: 5,
        filesAnalyzed: 3,
        toolsFound: 2,
        filesGenerated: 0,
      });
    });

    it("should accumulate counter increments", () => {
      discoveryStatusService.incrementCounters({ filesScanned: 5 });
      discoveryStatusService.incrementCounters({ filesScanned: 3 });
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.progress.filesScanned).toBe(8);
    });
  });

  describe("appendLog", () => {
    beforeEach(() => {
      discoveryStatusService.startDiscovery();
    });

    it("should append log entry with timestamp", () => {
      const beforeTime = new Date();
      discoveryStatusService.appendLog({
        level: "info",
        phase: "scanning",
        message: "Test message",
      });
      const afterTime = new Date();

      const status = discoveryStatusService.getCurrentStatus();

      expect(status.logs).toHaveLength(1);
      expect(status.logs[0]?.timestamp).toBeDefined();

      const logTime = new Date(status.logs[0]!.timestamp);
      expect(logTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(logTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it("should append log entry with correct level", () => {
      discoveryStatusService.appendLog({
        level: "warning",
        phase: "scanning",
        message: "Warning message",
      });

      const status = discoveryStatusService.getCurrentStatus();

      expect(status.logs[0]?.level).toBe("warning");
    });

    it("should append log entry with correct phase", () => {
      discoveryStatusService.appendLog({
        level: "info",
        phase: "analyzing",
        message: "Analyzing message",
      });

      const status = discoveryStatusService.getCurrentStatus();

      expect(status.logs[0]?.phase).toBe("analyzing");
    });

    it("should append log entry with correct message", () => {
      discoveryStatusService.appendLog({
        level: "info",
        phase: "scanning",
        message: "Custom test message",
      });

      const status = discoveryStatusService.getCurrentStatus();

      expect(status.logs[0]?.message).toBe("Custom test message");
    });

    it("should append log entry with context", () => {
      discoveryStatusService.appendLog({
        level: "info",
        phase: "analyzing",
        message: "Tool discovered",
        context: {
          toolName: "getUserProfile",
          detectedParams: ["db", "authService"],
          linesExtracted: 42,
        },
      });

      const status = discoveryStatusService.getCurrentStatus();

      expect(status.logs[0]?.context).toEqual({
        toolName: "getUserProfile",
        detectedParams: ["db", "authService"],
        linesExtracted: 42,
      });
    });

    it("should append multiple log entries in order", () => {
      discoveryStatusService.appendLog({
        level: "info",
        phase: "scanning",
        message: "First message",
      });
      discoveryStatusService.appendLog({
        level: "info",
        phase: "scanning",
        message: "Second message",
      });
      discoveryStatusService.appendLog({
        level: "info",
        phase: "analyzing",
        message: "Third message",
      });

      const status = discoveryStatusService.getCurrentStatus();

      expect(status.logs).toHaveLength(3);
      expect(status.logs[0]?.message).toBe("First message");
      expect(status.logs[1]?.message).toBe("Second message");
      expect(status.logs[2]?.message).toBe("Third message");
    });
  });

  describe("getCurrentStatus", () => {
    it("should return complete state snapshot", () => {
      discoveryStatusService.startDiscovery();
      discoveryStatusService.updatePhase("analyzing");
      discoveryStatusService.incrementCounters({
        filesScanned: 10,
        toolsFound: 2,
      });
      discoveryStatusService.appendLog({
        level: "info",
        phase: "analyzing",
        message: "Test log",
      });

      const status = discoveryStatusService.getCurrentStatus();

      expect(status).toEqual({
        isDiscovering: true,
        phase: "analyzing",
        progress: {
          filesScanned: 10,
          filesAnalyzed: 0,
          toolsFound: 2,
          filesGenerated: 0,
        },
        logs: expect.arrayContaining([
          expect.objectContaining({
            level: "info",
            phase: "analyzing",
            message: "Test log",
          }),
        ]) as unknown[],
      });
    });
  });

  describe("getIncrementalLogs", () => {
    beforeEach(() => {
      discoveryStatusService.startDiscovery();
    });

    it("should return all logs when offset is 0", () => {
      discoveryStatusService.appendLog({
        level: "info",
        phase: "scanning",
        message: "Log 1",
      });
      discoveryStatusService.appendLog({
        level: "info",
        phase: "scanning",
        message: "Log 2",
      });

      const logs = discoveryStatusService.getIncrementalLogs(0);

      expect(logs).toHaveLength(2);
      expect(logs[0]?.message).toBe("Log 1");
      expect(logs[1]?.message).toBe("Log 2");
    });

    it("should return only new logs after offset", () => {
      discoveryStatusService.appendLog({
        level: "info",
        phase: "scanning",
        message: "Log 1",
      });
      discoveryStatusService.appendLog({
        level: "info",
        phase: "scanning",
        message: "Log 2",
      });
      discoveryStatusService.appendLog({
        level: "info",
        phase: "scanning",
        message: "Log 3",
      });

      const logs = discoveryStatusService.getIncrementalLogs(2);

      expect(logs).toHaveLength(1);
      expect(logs[0]?.message).toBe("Log 3");
    });

    it("should return empty array when offset equals log count", () => {
      discoveryStatusService.appendLog({
        level: "info",
        phase: "scanning",
        message: "Log 1",
      });

      const logs = discoveryStatusService.getIncrementalLogs(1);

      expect(logs).toEqual([]);
    });

    it("should return empty array when offset exceeds log count", () => {
      discoveryStatusService.appendLog({
        level: "info",
        phase: "scanning",
        message: "Log 1",
      });

      const logs = discoveryStatusService.getIncrementalLogs(5);

      expect(logs).toEqual([]);
    });
  });

  describe("markComplete", () => {
    beforeEach(() => {
      discoveryStatusService.startDiscovery();
    });

    it("should set phase to complete", () => {
      const summary = {
        filesScanned: 100,
        filesWithToolImports: 5,
        toolsDiscovered: 3,
        filesGenerated: 20,
        skippedFiles: [],
      };

      discoveryStatusService.markComplete(summary);
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.phase).toBe("complete");
    });

    it("should set isDiscovering to false", () => {
      const summary = {
        filesScanned: 100,
        filesWithToolImports: 5,
        toolsDiscovered: 3,
        filesGenerated: 20,
        skippedFiles: [],
      };

      discoveryStatusService.markComplete(summary);
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.isDiscovering).toBe(false);
    });

    it("should store summary in result", () => {
      const summary = {
        filesScanned: 100,
        filesWithToolImports: 5,
        toolsDiscovered: 3,
        filesGenerated: 20,
        skippedFiles: [{ path: "test.ts", reason: "No AI SDK import" }],
      };

      discoveryStatusService.markComplete(summary);
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.result).toEqual({
        discoveredToolsCount: 3,
        summary,
      });
    });
  });

  describe("markError", () => {
    beforeEach(() => {
      discoveryStatusService.startDiscovery();
    });

    it("should set phase to error", () => {
      discoveryStatusService.markError("Test error");
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.phase).toBe("error");
    });

    it("should set isDiscovering to false", () => {
      discoveryStatusService.markError("Test error");
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.isDiscovering).toBe(false);
    });

    it("should store error message in result", () => {
      discoveryStatusService.markError("Discovery failed: connection timeout");
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.result?.error).toBe("Discovery failed: connection timeout");
    });

    it("should preserve progress counters when marking error", () => {
      discoveryStatusService.incrementCounters({
        filesScanned: 50,
        toolsFound: 2,
      });

      discoveryStatusService.markError("Test error");
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.progress).toEqual({
        filesScanned: 50,
        filesAnalyzed: 0,
        toolsFound: 2,
        filesGenerated: 0,
      });
    });

    it("should preserve logs when marking error", () => {
      discoveryStatusService.appendLog({
        level: "info",
        phase: "scanning",
        message: "Started scanning",
      });

      discoveryStatusService.markError("Test error");
      const status = discoveryStatusService.getCurrentStatus();

      expect(status.logs).toHaveLength(1);
      expect(status.logs[0]?.message).toBe("Started scanning");
    });
  });
});

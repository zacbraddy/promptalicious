import * as fs from "fs/promises";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { cancelDiscovery } from "@/services/discovery-cancel.service";
import * as discoveryStatusService from "@/services/discovery-status.service";
import { db } from "@/db/connection";
import { tools } from "@/db/schema";

vi.mock("fs/promises");
vi.mock("@/services/discovery-status.service", () => ({
  requestCancellation: vi.fn(),
  getCurrentStatus: vi.fn(),
  acknowledgeCancellation: vi.fn(),
}));
vi.mock("@/db/connection", () => ({
  db: {
    delete: vi.fn(),
  },
}));

describe("Discovery Cancel Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("cancelDiscovery", () => {
    it("should successfully cancel in-progress discovery and clean up", async () => {
      vi.mocked(discoveryStatusService.getCurrentStatus)
        .mockReturnValueOnce({
          isDiscovering: true,
          phase: "scanning",
          progress: {
            filesScanned: 10,
            filesAnalyzed: 0,
            toolsFound: 0,
            filesGenerated: 0,
          },
          logs: [],
        })
        .mockReturnValueOnce({
          isDiscovering: false,
          phase: "idle",
          progress: {
            filesScanned: 0,
            filesAnalyzed: 0,
            toolsFound: 0,
            filesGenerated: 0,
          },
          logs: [],
        });

      vi.mocked(discoveryStatusService.requestCancellation).mockReturnValue(
        undefined,
      );
      vi.mocked(fs.rm).mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      } as never);

      const result = await cancelDiscovery("workspace/test-project");

      expect(discoveryStatusService.requestCancellation).toHaveBeenCalledOnce();
      expect(discoveryStatusService.getCurrentStatus).toHaveBeenCalled();
      expect(fs.rm).toHaveBeenCalledWith("workspace/test-project", {
        recursive: true,
        force: true,
      });
      expect(db.delete).toHaveBeenCalledWith(tools);
      expect(result.cancelled).toBe(true);
      expect(result.message).toContain("cancelled");
      expect(result.message).toContain("workspace cleaned up");
    });

    it("should return error when no discovery is in progress", async () => {
      vi.mocked(discoveryStatusService.getCurrentStatus).mockReturnValue({
        isDiscovering: false,
        phase: "idle",
        progress: {
          filesScanned: 0,
          filesAnalyzed: 0,
          toolsFound: 0,
          filesGenerated: 0,
        },
        logs: [],
      });

      const result = await cancelDiscovery("workspace/test-project");

      expect(discoveryStatusService.requestCancellation).not.toHaveBeenCalled();
      expect(fs.rm).not.toHaveBeenCalled();
      expect(db.delete).not.toHaveBeenCalled();
      expect(result.cancelled).toBe(false);
      expect(result.message).toContain("No discovery in progress");
    });

    it("should wait for discovery to acknowledge cancellation before cleanup", async () => {
      const statusChecks = [
        {
          isDiscovering: true,
          phase: "scanning" as const,
          progress: {
            filesScanned: 10,
            filesAnalyzed: 0,
            toolsFound: 0,
            filesGenerated: 0,
          },
          logs: [],
        },
        {
          isDiscovering: true,
          phase: "scanning" as const,
          progress: {
            filesScanned: 15,
            filesAnalyzed: 0,
            toolsFound: 0,
            filesGenerated: 0,
          },
          logs: [],
        },
        {
          isDiscovering: false,
          phase: "idle" as const,
          progress: {
            filesScanned: 15,
            filesAnalyzed: 0,
            toolsFound: 0,
            filesGenerated: 0,
          },
          logs: [],
        },
      ];

      let callCount = 0;
      vi.mocked(discoveryStatusService.getCurrentStatus).mockImplementation(
        () => {
          return (
            statusChecks[callCount++] ?? statusChecks[statusChecks.length - 1]!
          );
        },
      );

      vi.mocked(discoveryStatusService.requestCancellation).mockReturnValue(
        undefined,
      );
      vi.mocked(fs.rm).mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      } as never);

      const result = await cancelDiscovery("workspace/test-project");

      expect(discoveryStatusService.getCurrentStatus).toHaveBeenCalledTimes(3);
      expect(fs.rm).toHaveBeenCalled();
      expect(result.cancelled).toBe(true);
    });

    it("should remove workspace directory with recursive force option", async () => {
      vi.mocked(discoveryStatusService.getCurrentStatus)
        .mockReturnValueOnce({
          isDiscovering: true,
          phase: "generating",
          progress: {
            filesScanned: 50,
            filesAnalyzed: 10,
            toolsFound: 3,
            filesGenerated: 5,
          },
          logs: [],
        })
        .mockReturnValueOnce({
          isDiscovering: false,
          phase: "idle",
          progress: {
            filesScanned: 0,
            filesAnalyzed: 0,
            toolsFound: 0,
            filesGenerated: 0,
          },
          logs: [],
        });

      vi.mocked(discoveryStatusService.requestCancellation).mockReturnValue(
        undefined,
      );
      vi.mocked(fs.rm).mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      } as never);

      await cancelDiscovery("workspace/test-project");

      expect(fs.rm).toHaveBeenCalledWith("workspace/test-project", {
        recursive: true,
        force: true,
      });
    });

    it("should clear incomplete tools from database", async () => {
      vi.mocked(discoveryStatusService.getCurrentStatus)
        .mockReturnValueOnce({
          isDiscovering: true,
          phase: "analyzing",
          progress: {
            filesScanned: 30,
            filesAnalyzed: 5,
            toolsFound: 2,
            filesGenerated: 0,
          },
          logs: [],
        })
        .mockReturnValueOnce({
          isDiscovering: false,
          phase: "idle",
          progress: {
            filesScanned: 0,
            filesAnalyzed: 0,
            toolsFound: 0,
            filesGenerated: 0,
          },
          logs: [],
        });

      vi.mocked(discoveryStatusService.requestCancellation).mockReturnValue(
        undefined,
      );
      vi.mocked(fs.rm).mockResolvedValue(undefined);

      const mockExecute = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({
        execute: mockExecute,
      } as never);

      await cancelDiscovery("workspace/test-project");

      expect(db.delete).toHaveBeenCalledWith(tools);
      expect(mockExecute).toHaveBeenCalled();
    });

    it("should handle filesystem errors gracefully", async () => {
      vi.mocked(discoveryStatusService.getCurrentStatus)
        .mockReturnValueOnce({
          isDiscovering: true,
          phase: "scanning",
          progress: {
            filesScanned: 5,
            filesAnalyzed: 0,
            toolsFound: 0,
            filesGenerated: 0,
          },
          logs: [],
        })
        .mockReturnValueOnce({
          isDiscovering: false,
          phase: "idle",
          progress: {
            filesScanned: 0,
            filesAnalyzed: 0,
            toolsFound: 0,
            filesGenerated: 0,
          },
          logs: [],
        });

      vi.mocked(discoveryStatusService.requestCancellation).mockReturnValue(
        undefined,
      );
      vi.mocked(fs.rm).mockRejectedValue(
        new Error("Permission denied: workspace/test-project"),
      );
      vi.mocked(db.delete).mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      } as never);

      const result = await cancelDiscovery("workspace/test-project");

      expect(result.cancelled).toBe(false);
      expect(result.message).toContain("Failed to clean up workspace");
      expect(result.message).toContain("Permission denied");
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(discoveryStatusService.getCurrentStatus)
        .mockReturnValueOnce({
          isDiscovering: true,
          phase: "scanning",
          progress: {
            filesScanned: 5,
            filesAnalyzed: 0,
            toolsFound: 0,
            filesGenerated: 0,
          },
          logs: [],
        })
        .mockReturnValueOnce({
          isDiscovering: false,
          phase: "idle",
          progress: {
            filesScanned: 0,
            filesAnalyzed: 0,
            toolsFound: 0,
            filesGenerated: 0,
          },
          logs: [],
        });

      vi.mocked(discoveryStatusService.requestCancellation).mockReturnValue(
        undefined,
      );
      vi.mocked(fs.rm).mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({
        execute: vi
          .fn()
          .mockRejectedValue(new Error("Database connection lost")),
      } as never);

      const result = await cancelDiscovery("workspace/test-project");

      expect(result.cancelled).toBe(false);
      expect(result.message).toContain("Failed to clean up database");
      expect(result.message).toContain("Database connection lost");
    });

    it("should timeout if discovery does not acknowledge cancellation", async () => {
      vi.mocked(discoveryStatusService.getCurrentStatus).mockReturnValue({
        isDiscovering: true,
        phase: "scanning",
        progress: {
          filesScanned: 10,
          filesAnalyzed: 0,
          toolsFound: 0,
          filesGenerated: 0,
        },
        logs: [],
      });

      vi.mocked(discoveryStatusService.requestCancellation).mockReturnValue(
        undefined,
      );

      const result = await cancelDiscovery("workspace/test-project", 100);

      expect(result.cancelled).toBe(false);
      expect(result.message).toContain("timed out");
      expect(fs.rm).not.toHaveBeenCalled();
      expect(db.delete).not.toHaveBeenCalled();
    });
  });
});

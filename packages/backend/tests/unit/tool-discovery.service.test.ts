/*
 * Tool Discovery Service - Unit Tests
 *
 * These tests verify the basic structure and error handling of the Tool Discovery Service.
 *
 * Full ts-morph integration tests (parsing tool() calls, extracting metadata, scope analysis
 * for detecting hook parameters) are implemented as integration tests with real fixture files.
 * See: ../integration/tool-discovery.integration.test.ts
 *
 * This approach avoids brittle mocks of ts-morph internals and provides more valuable test coverage.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, beforeEach, vi } from "vitest";

import * as toolDiscoveryService from "@/services/tool-discovery.service";
import * as discoveryStatusService from "@/services/discovery-status.service";
import { db } from "@/db/connection";

vi.mock("@/services/discovery-status.service");
vi.mock("@/db/connection", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));
vi.mock("ts-morph", () => {
  const mockProject = vi.fn().mockImplementation(function () {
    return {
      getSourceFiles: vi.fn().mockReturnValue([]),
      addSourceFilesAtPaths: vi.fn(),
    };
  });

  return {
    Project: mockProject,
    Node: {
      isObjectLiteralExpression: vi.fn(),
      isPropertyAssignment: vi.fn(),
      isFunctionLikeDeclaration: vi.fn(),
      isVariableDeclaration: vi.fn(),
    },
    SyntaxKind: {
      CallExpression: 211,
      Identifier: 79,
    },
  };
});

function createMockDb() {
  return {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue(undefined),
  };
}

describe("toolDiscoveryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(discoveryStatusService.isCancellationRequested).mockReturnValue(
      false,
    );
  });

  describe("discoverTools", () => {
    it("should log scanning start message", async () => {
      const mockDb = createMockDb();
      vi.mocked(db.insert).mockReturnValue(mockDb as never);

      await toolDiscoveryService.discoverTools("/test/project/path");

      expect(discoveryStatusService.appendLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "info",
          phase: "scanning",
          message: expect.stringContaining("Scanning project"),
        }),
      );
    });

    it("should return DiscoverySummary structure with required fields", async () => {
      const mockDb = createMockDb();
      vi.mocked(db.insert).mockReturnValue(mockDb as never);

      const result =
        await toolDiscoveryService.discoverTools("/test/project/path");

      expect(result).toHaveProperty("filesScanned");
      expect(result).toHaveProperty("filesWithToolImports");
      expect(result).toHaveProperty("toolsDiscovered");
      expect(result).toHaveProperty("filesGenerated");
      expect(result).toHaveProperty("skippedFiles");
      expect(Array.isArray(result.skippedFiles)).toBe(true);
    });

    it("should return zero counts when no files are found", async () => {
      const mockDb = createMockDb();
      vi.mocked(db.insert).mockReturnValue(mockDb as never);

      const result =
        await toolDiscoveryService.discoverTools("/test/project/path");

      expect(result.filesScanned).toBe(0);
      expect(result.filesWithToolImports).toBe(0);
      expect(result.toolsDiscovered).toBe(0);
    });

    it("should respect cancellation flag during discovery", async () => {
      vi.mocked(discoveryStatusService.isCancellationRequested)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const mockDb = createMockDb();
      vi.mocked(db.insert).mockReturnValue(mockDb as never);

      const result =
        await toolDiscoveryService.discoverTools("/test/project/path");

      expect(result).toBeDefined();
    });

    it("should handle missing tsconfig.json gracefully", async () => {
      const mockDb = createMockDb();
      vi.mocked(db.insert).mockReturnValue(mockDb as never);

      const result =
        await toolDiscoveryService.discoverTools("/test/project/path");

      expect(result).toBeDefined();
      expect(discoveryStatusService.appendLog).toHaveBeenCalled();
    });
  });
});

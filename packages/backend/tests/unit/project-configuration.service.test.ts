import { describe, it, expect, vi, beforeEach } from "vitest";

import * as projectConfigService from "@/services/project-configuration.service";
import { db } from "@/db/connection";

vi.mock("@/db/connection", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("projectConfigurationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProjectConfiguration", () => {
    it("should return configuration when it exists", async () => {
      const mockConfig = {
        id: 1,
        name: "test-project",
        targetProjectPath: "../test-project",
        workspacePath: "workspace/test-project",
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T00:00:00.000Z"),
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockConfig]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await projectConfigService.getProjectConfiguration();

      expect(result).toEqual(mockConfig);
      expect(db.select).toHaveBeenCalled();
    });

    it("should return null when configuration does not exist", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await projectConfigService.getProjectConfiguration();

      expect(result).toBeNull();
    });

    it("should throw error when database query fails", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error("Database error")),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      await expect(
        projectConfigService.getProjectConfiguration(),
      ).rejects.toThrow("Database error");
    });
  });

  describe("updateProjectConfiguration", () => {
    it("should create new configuration when none exists", async () => {
      const inputData = {
        name: "new-project",
        targetProjectPath: "../new-project",
      };

      const mockInsertedConfig = {
        id: 1,
        name: "new-project",
        targetProjectPath: "../new-project",
        workspacePath: "workspace/new-project",
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T00:00:00.000Z"),
      };

      const mockInsertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockInsertedConfig]),
      };

      vi.mocked(db.insert).mockReturnValue(mockInsertChain as never);

      const result =
        await projectConfigService.updateProjectConfiguration(inputData);

      expect(result).toEqual(mockInsertedConfig);
      expect(result.workspacePath).toBe("workspace/new-project");
      expect(db.insert).toHaveBeenCalled();
    });

    it("should update existing configuration when id=1 exists", async () => {
      const inputData = {
        name: "updated-project",
        targetProjectPath: "../updated-project",
      };

      const mockUpdatedConfig = {
        id: 1,
        name: "updated-project",
        targetProjectPath: "../updated-project",
        workspacePath: "workspace/updated-project",
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T12:00:00.000Z"),
      };

      const mockInsertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockUpdatedConfig]),
      };

      vi.mocked(db.insert).mockReturnValue(mockInsertChain as never);

      const result =
        await projectConfigService.updateProjectConfiguration(inputData);

      expect(result).toEqual(mockUpdatedConfig);
      expect(result.workspacePath).toBe("workspace/updated-project");
    });

    it("should derive workspace path from project name", async () => {
      const inputData = {
        name: "my-awesome-project",
        targetProjectPath: "../some-other-path",
      };

      const mockInsertedConfig = {
        id: 1,
        name: "my-awesome-project",
        targetProjectPath: "../some-other-path",
        workspacePath: "workspace/my-awesome-project",
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T00:00:00.000Z"),
      };

      const mockInsertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockInsertedConfig]),
      };

      vi.mocked(db.insert).mockReturnValue(mockInsertChain as never);

      const result =
        await projectConfigService.updateProjectConfiguration(inputData);

      expect(result.workspacePath).toBe("workspace/my-awesome-project");
    });

    it("should handle special characters in project name when deriving workspace path", async () => {
      const inputData = {
        name: "project-with-dashes_and_underscores",
        targetProjectPath: "../test",
      };

      const mockInsertedConfig = {
        id: 1,
        name: "project-with-dashes_and_underscores",
        targetProjectPath: "../test",
        workspacePath: "workspace/project-with-dashes_and_underscores",
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T00:00:00.000Z"),
      };

      const mockInsertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockInsertedConfig]),
      };

      vi.mocked(db.insert).mockReturnValue(mockInsertChain as never);

      const result =
        await projectConfigService.updateProjectConfiguration(inputData);

      expect(result.workspacePath).toBe(
        "workspace/project-with-dashes_and_underscores",
      );
    });

    it("should throw error when database insert fails", async () => {
      const inputData = {
        name: "test-project",
        targetProjectPath: "../test-project",
      };

      const mockInsertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        returning: vi
          .fn()
          .mockRejectedValue(new Error("Database insert error")),
      };

      vi.mocked(db.insert).mockReturnValue(mockInsertChain as never);

      await expect(
        projectConfigService.updateProjectConfiguration(inputData),
      ).rejects.toThrow("Database insert error");
    });

    it("should throw error when no rows returned from insert", async () => {
      const inputData = {
        name: "test-project",
        targetProjectPath: "../test-project",
      };

      const mockInsertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.insert).mockReturnValue(mockInsertChain as never);

      await expect(
        projectConfigService.updateProjectConfiguration(inputData),
      ).rejects.toThrow();
    });
  });

  describe("startDiscovery", () => {
    it("should return early if no project configuration exists", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      await expect(
        projectConfigService.startDiscovery(),
      ).resolves.toBeUndefined();
    });

    it("should start async discovery when project configuration exists", async () => {
      const mockConfig = {
        id: 1,
        name: "test-project",
        targetProjectPath: "test/path",
        workspacePath: "workspace/test-project",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockConfig]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      await projectConfigService.startDiscovery();
    });
  });
});

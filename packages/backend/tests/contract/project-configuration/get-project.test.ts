import { describe, it, expect, vi, beforeEach } from "vitest";

import app from "@/app";
import * as projectConfigService from "@/services/projectConfigurationService";

vi.mock("@/services/projectConfigurationService", () => ({
  getProjectConfiguration: vi.fn(),
  updateProjectConfiguration: vi.fn(),
  startDiscovery: vi.fn(),
  getDiscoveryStatus: vi.fn(),
}));

describe("GET /api/project endpoint contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Success response (200)", () => {
    it("should return 200 with project configuration when project is configured", async () => {
      const mockServiceConfig = {
        id: 1,
        name: "test-project",
        targetProjectPath: "../test-project",
        workspacePath: "workspace/test-project",
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T00:00:00.000Z"),
      };

      vi.mocked(projectConfigService.getProjectConfiguration).mockResolvedValue(
        mockServiceConfig,
      );

      const res = await app.request("/api/project");
      const json = (await res.json()) as {
        id: number;
        name: string;
        targetProjectPath: string;
        workspacePath: string;
        createdAt: string;
        updatedAt: string;
      };

      expect(res.status).toBe(200);
      expect(json).toEqual({
        id: 1,
        name: "test-project",
        targetProjectPath: "../test-project",
        workspacePath: "workspace/test-project",
        createdAt: "2025-01-10T00:00:00.000Z",
        updatedAt: "2025-01-10T00:00:00.000Z",
      });
      expect(json.id).toBe(1);
      expect(json.name).toBe("test-project");
      expect(json.targetProjectPath).toBe("../test-project");
      expect(json.workspacePath).toBe("workspace/test-project");
      expect(json.createdAt).toBeDefined();
      expect(json.updatedAt).toBeDefined();
    });

    it("should return configuration with all required fields matching schema", async () => {
      const mockConfig = {
        id: 1,
        name: "my-awesome-project",
        targetProjectPath: "../my-awesome-project",
        workspacePath: "workspace/my-awesome-project",
        createdAt: new Date("2025-01-10T10:30:00.000Z"),
        updatedAt: new Date("2025-01-10T14:45:00.000Z"),
      };

      vi.mocked(projectConfigService.getProjectConfiguration).mockResolvedValue(
        mockConfig,
      );

      const res = await app.request("/api/project");
      const json = (await res.json()) as typeof mockConfig;

      expect(res.status).toBe(200);
      expect(typeof json.id).toBe("number");
      expect(json.id).toBe(1);
      expect(typeof json.name).toBe("string");
      expect(json.name.length).toBeGreaterThan(0);
      expect(typeof json.targetProjectPath).toBe("string");
      expect(json.targetProjectPath.length).toBeGreaterThan(0);
      expect(typeof json.workspacePath).toBe("string");
      expect(json.workspacePath).toMatch(/^workspace\//);
      expect(typeof json.createdAt).toBe("string");
      expect(new Date(json.createdAt).toISOString()).toBe(json.createdAt);
      expect(typeof json.updatedAt).toBe("string");
      expect(new Date(json.updatedAt).toISOString()).toBe(json.updatedAt);
    });
  });

  describe("Not found response (404)", () => {
    it("should return 404 when no project is configured", async () => {
      vi.mocked(projectConfigService.getProjectConfiguration).mockResolvedValue(
        null,
      );

      const res = await app.request("/api/project");
      const json = (await res.json()) as {
        error: { errorType: string; errorMessage: string };
      };

      expect(res.status).toBe(404);
      expect(json.error).toBeDefined();
      expect(json.error.errorType).toBe("not_found");
      expect(json.error.errorMessage).toContain("No project configured");
    });

    it("should return standard error schema in 404 response", async () => {
      vi.mocked(projectConfigService.getProjectConfiguration).mockResolvedValue(
        null,
      );

      const res = await app.request("/api/project");
      const json = (await res.json()) as {
        error: { errorType: string; errorMessage: string };
      };

      expect(res.status).toBe(404);
      expect(typeof json.error.errorType).toBe("string");
      expect(typeof json.error.errorMessage).toBe("string");
      expect(json.error.errorMessage.length).toBeGreaterThan(0);
    });
  });

  describe("Response consistency", () => {
    it("should return same configuration for multiple GET requests", async () => {
      const mockConfig = {
        id: 1,
        name: "consistent-project",
        targetProjectPath: "../consistent-project",
        workspacePath: "workspace/consistent-project",
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T00:00:00.000Z"),
      };

      vi.mocked(projectConfigService.getProjectConfiguration).mockResolvedValue(
        mockConfig,
      );

      const res1 = await app.request("/api/project");
      const json1 = (await res1.json()) as typeof mockConfig;

      const res2 = await app.request("/api/project");
      const json2 = (await res2.json()) as typeof mockConfig;

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(json1).toEqual(json2);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  UpdateProjectConfigurationRequest,
  UpdateProjectConfigurationSuccessResponse,
  UpdateProjectConfigurationErrorResponse,
  DiscoveryStatus,
} from "@promptalicious/shared-infra";

import app from "@/app";
import * as projectConfigService from "@/services/projectConfigurationService";

vi.mock("@/services/projectConfigurationService", () => ({
  getProjectConfiguration: vi.fn(),
  updateProjectConfiguration: vi.fn(),
  startDiscovery: vi.fn(),
  getDiscoveryStatus: vi.fn(),
}));

describe("PUT /api/project endpoint contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // TODO: Remove eslint-disable once implementation is complete

    vi.mocked(
      projectConfigService.updateProjectConfiguration,
    ).mockImplementation(({ name, targetProjectPath }) =>
      Promise.resolve({
        id: 1,
        name,
        targetProjectPath,
        workspacePath: `workspace/${name}`,
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T00:00:00.000Z"),
      }),
    );

    vi.mocked(projectConfigService.startDiscovery).mockResolvedValue(undefined);
  });

  describe("Success responses (202 Accepted)", () => {
    it("should return 202 Accepted when configuring a new project", async () => {
      const res = await app.request("/api/project", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "test-project",
          targetProjectPath: "../test-project",
        } satisfies UpdateProjectConfigurationRequest),
      });

      const json =
        (await res.json()) as UpdateProjectConfigurationSuccessResponse;

      expect(res.status).toBe(202);
      expect(json).toHaveProperty("config");
      expect(json.config).toHaveProperty("id", 1);
      expect(json.config).toHaveProperty("name", "test-project");
      expect(json.config).toHaveProperty(
        "targetProjectPath",
        "../test-project",
      );
      expect(json.config).toHaveProperty("workspacePath");
      expect(json.config.workspacePath).toMatch(/^workspace\/test-project$/);
      expect(json.config).toHaveProperty("createdAt");
      expect(json.config).toHaveProperty("updatedAt");

      expect(json).toHaveProperty("discoveryStarted", true);

      expect(
        // TODO: Remove eslint-disable once implementation is complete

        projectConfigService.updateProjectConfiguration,
      ).toHaveBeenCalledWith({
        name: "test-project",
        targetProjectPath: "../test-project",
      });

      // TODO: Remove eslint-disable once implementation is complete

      expect(projectConfigService.startDiscovery).toHaveBeenCalledTimes(1);
    });

    it("should return 202 Accepted when updating existing project configuration", async () => {
      const res = await app.request("/api/project", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "updated-project",
          targetProjectPath: "../updated-project",
        } satisfies UpdateProjectConfigurationRequest),
      });

      const json =
        (await res.json()) as UpdateProjectConfigurationSuccessResponse;

      expect(res.status).toBe(202);
      expect(json.config.name).toBe("updated-project");
      expect(json.config.targetProjectPath).toBe("../updated-project");
      expect(json.config.workspacePath).toMatch(/^workspace\/updated-project$/);
      expect(json.discoveryStarted).toBe(true);
    });

    it("should derive workspace path from project name", async () => {
      const res = await app.request("/api/project", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "my-awesome-project",
          targetProjectPath: "../some-other-path",
        } satisfies UpdateProjectConfigurationRequest),
      });

      const json =
        (await res.json()) as UpdateProjectConfigurationSuccessResponse;

      expect(res.status).toBe(202);
      expect(json.config.workspacePath).toBe("workspace/my-awesome-project");
    });
  });

  describe("Validation error responses (400)", () => {
    it("should return 400 when name is missing", async () => {
      const res = await app.request("/api/project", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetProjectPath: "../test-project",
        }),
      });

      const json =
        (await res.json()) as UpdateProjectConfigurationErrorResponse;

      expect(res.status).toBe(400);
      expect(json).toHaveProperty("error");
      expect(json.error.errorType).toBe("validation");
      expect(json.error.errorMessage).toContain("name");
    });

    it("should return 400 when targetProjectPath is missing", async () => {
      const res = await app.request("/api/project", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "test-project",
        }),
      });

      const json =
        (await res.json()) as UpdateProjectConfigurationErrorResponse;

      expect(res.status).toBe(400);
      expect(json.error.errorType).toBe("validation");
      expect(json.error.errorMessage).toContain("targetProjectPath");
    });

    it("should return 400 when name is empty string", async () => {
      const res = await app.request("/api/project", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "",
          targetProjectPath: "../test-project",
        }),
      });

      const json =
        (await res.json()) as UpdateProjectConfigurationErrorResponse;

      expect(res.status).toBe(400);
      expect(json.error.errorType).toBe("validation");
      expect(json.error.errorMessage).toContain("name");
      expect(json.error.errorMessage).toContain("empty");
    });

    it("should return 400 when targetProjectPath is empty string", async () => {
      const res = await app.request("/api/project", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "test-project",
          targetProjectPath: "",
        }),
      });

      const json =
        (await res.json()) as UpdateProjectConfigurationErrorResponse;

      expect(res.status).toBe(400);
      expect(json.error.errorType).toBe("validation");
      expect(json.error.errorMessage).toContain("targetProjectPath");
      expect(json.error.errorMessage).toContain("empty");
    });
  });

  describe("Response schema validation", () => {
    it("should ensure success response matches schema with all required fields", async () => {
      const res = await app.request("/api/project", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "test-project",
          targetProjectPath: "../test-project",
        } satisfies UpdateProjectConfigurationRequest),
      });

      const json =
        (await res.json()) as UpdateProjectConfigurationSuccessResponse;

      expect(json.config).toBeDefined();
      expect(typeof json.config.id).toBe("number");
      expect(typeof json.config.name).toBe("string");
      expect(typeof json.config.targetProjectPath).toBe("string");
      expect(typeof json.config.workspacePath).toBe("string");
      expect(typeof json.config.createdAt).toBe("string");
      expect(typeof json.config.updatedAt).toBe("string");

      expect(typeof json.discoveryStarted).toBe("boolean");
      expect(json.discoveryStarted).toBe(true);
    });
  });

  describe("Async discovery behaviour", () => {
    it("should return immediately with 202 Accepted without waiting for discovery to complete", async () => {
      const startTime = Date.now();

      const res = await app.request("/api/project", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "test-project",
          targetProjectPath: "../test-project",
        } satisfies UpdateProjectConfigurationRequest),
      });

      const duration = Date.now() - startTime;

      expect(res.status).toBe(202);
      expect(duration).toBeLessThan(1000);
    });

    it("should indicate discovery has started via discoveryStarted flag", async () => {
      const res = await app.request("/api/project", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "test-project",
          targetProjectPath: "../test-project",
        } satisfies UpdateProjectConfigurationRequest),
      });

      const json =
        (await res.json()) as UpdateProjectConfigurationSuccessResponse;

      expect(json.discoveryStarted).toBe(true);
    });

    it("should trigger async discovery after saving configuration", async () => {
      await app.request("/api/project", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "test-project",
          targetProjectPath: "../test-project",
        } satisfies UpdateProjectConfigurationRequest),
      });

      // TODO: Remove eslint-disable once implementation is complete

      expect(projectConfigService.startDiscovery).toHaveBeenCalledTimes(1);
    });
  });
});

describe("GET /api/project/discovery/status endpoint contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("When discovery is in progress", () => {
    it("should return 200 with discovery status during scanning phase", async () => {
      const mockStatus: DiscoveryStatus = {
        isDiscovering: true,
        phase: "scanning",
        progress: {
          filesScanned: 42,
          filesAnalyzed: 0,
          toolsFound: 0,
          filesGenerated: 0,
        },
        logs: [
          {
            timestamp: "2025-11-10T10:00:00Z",
            level: "info",
            phase: "scanning",
            message: "Started scanning project directory",
          },
          {
            timestamp: "2025-11-10T10:00:01Z",
            level: "info",
            phase: "scanning",
            message: "Found 42 TypeScript files",
          },
        ],
      };

      // TODO: Remove eslint-disable once implementation is complete

      vi.mocked(projectConfigService.getDiscoveryStatus).mockResolvedValue(
        mockStatus,
      );

      const res = await app.request("/api/project/discovery/status");
      const json = (await res.json()) as DiscoveryStatus;

      expect(res.status).toBe(200);
      expect(json.isDiscovering).toBe(true);
      expect(json.phase).toBe("scanning");
      expect(json.progress).toBeDefined();
      if (json.progress) {
        expect(json.progress.filesScanned).toBe(42);
        expect(json.progress.filesAnalyzed).toBe(0);
        expect(json.progress.toolsFound).toBe(0);
        expect(json.progress.filesGenerated).toBe(0);
      }
      expect(json.logs).toHaveLength(2);
      expect(json.logs[0]?.message).toBe("Started scanning project directory");
    });

    it("should return 200 with discovery status during analyzing phase", async () => {
      const mockStatus: DiscoveryStatus = {
        isDiscovering: true,
        phase: "analyzing",
        progress: {
          filesScanned: 50,
          filesAnalyzed: 10,
          toolsFound: 3,
          filesGenerated: 0,
        },
        logs: [
          {
            timestamp: "2025-11-10T10:00:05Z",
            level: "info",
            phase: "analyzing",
            message: "Analyzing tool definitions",
            context: {
              filePath: "src/tools/getUserProfile.ts",
              toolName: "getUserProfile",
            },
          },
        ],
      };

      // TODO: Remove eslint-disable once implementation is complete

      vi.mocked(projectConfigService.getDiscoveryStatus).mockResolvedValue(
        mockStatus,
      );

      const res = await app.request("/api/project/discovery/status");
      const json = (await res.json()) as DiscoveryStatus;

      expect(res.status).toBe(200);
      expect(json.isDiscovering).toBe(true);
      expect(json.phase).toBe("analyzing");
      if (json.progress) {
        expect(json.progress.filesAnalyzed).toBe(10);
        expect(json.progress.toolsFound).toBe(3);
      }
      expect(json.logs[0]?.context?.toolName).toBe("getUserProfile");
    });

    it("should return 200 with discovery status during generating phase", async () => {
      const mockStatus: DiscoveryStatus = {
        isDiscovering: true,
        phase: "generating",
        progress: {
          filesScanned: 50,
          filesAnalyzed: 50,
          toolsFound: 5,
          filesGenerated: 15,
        },
        logs: [
          {
            timestamp: "2025-11-10T10:00:10Z",
            level: "info",
            phase: "generating",
            message: "Generated hook files for tool",
            context: {
              toolName: "getUserProfile",
              linesExtracted: 50,
              detectedParams: ["db", "authService"],
            },
          },
        ],
      };

      // TODO: Remove eslint-disable once implementation is complete

      vi.mocked(projectConfigService.getDiscoveryStatus).mockResolvedValue(
        mockStatus,
      );

      const res = await app.request("/api/project/discovery/status");
      const json = (await res.json()) as DiscoveryStatus;

      expect(res.status).toBe(200);
      expect(json.isDiscovering).toBe(true);
      expect(json.phase).toBe("generating");
      if (json.progress) {
        expect(json.progress.filesGenerated).toBe(15);
      }
      expect(json.logs[0]?.context?.detectedParams).toEqual([
        "db",
        "authService",
      ]);
    });
  });

  describe("When discovery is idle", () => {
    it("should return 200 with idle status when no discovery has been started", async () => {
      const mockStatus: DiscoveryStatus = {
        isDiscovering: false,
        phase: "idle",
        logs: [],
      };

      // TODO: Remove eslint-disable once implementation is complete

      vi.mocked(projectConfigService.getDiscoveryStatus).mockResolvedValue(
        mockStatus,
      );

      const res = await app.request("/api/project/discovery/status");
      const json = (await res.json()) as DiscoveryStatus;

      expect(res.status).toBe(200);
      expect(json.isDiscovering).toBe(false);
      expect(json.phase).toBe("idle");
      expect(json.logs).toEqual([]);
      expect(json.result).toBeUndefined();
    });
  });

  describe("When discovery is complete", () => {
    it("should return 200 with complete status and result summary", async () => {
      const mockStatus: DiscoveryStatus = {
        isDiscovering: false,
        phase: "complete",
        progress: {
          filesScanned: 127,
          filesAnalyzed: 8,
          toolsFound: 5,
          filesGenerated: 30,
        },
        logs: [
          {
            timestamp: "2025-11-10T10:00:20Z",
            level: "info",
            phase: "complete",
            message: "Discovery completed successfully",
          },
        ],
        result: {
          discoveredToolsCount: 5,
          summary: {
            filesScanned: 127,
            filesWithToolImports: 8,
            toolsDiscovered: 5,
            filesGenerated: 30,
            skippedFiles: [
              {
                path: "src/tools/broken.ts",
                reason: "Parse error: unexpected token",
              },
            ],
          },
        },
      };

      // TODO: Remove eslint-disable once implementation is complete

      vi.mocked(projectConfigService.getDiscoveryStatus).mockResolvedValue(
        mockStatus,
      );

      const res = await app.request("/api/project/discovery/status");
      const json = (await res.json()) as DiscoveryStatus;

      expect(res.status).toBe(200);
      expect(json.isDiscovering).toBe(false);
      expect(json.phase).toBe("complete");
      expect(json.result).toBeDefined();
      if (json.result) {
        expect(json.result.discoveredToolsCount).toBe(5);
        expect(json.result.summary.toolsDiscovered).toBe(5);
        expect(json.result.summary.filesGenerated).toBe(30);
        expect(json.result.summary.skippedFiles).toHaveLength(1);
        expect(json.result.summary.skippedFiles[0]?.reason).toContain(
          "Parse error",
        );
      }
    });
  });

  describe("When discovery has errored", () => {
    it("should return 200 with error status and error message in result", async () => {
      const mockStatus: DiscoveryStatus = {
        isDiscovering: false,
        phase: "error",
        progress: {
          filesScanned: 10,
          filesAnalyzed: 0,
          toolsFound: 0,
          filesGenerated: 0,
        },
        logs: [
          {
            timestamp: "2025-11-10T10:00:02Z",
            level: "error",
            phase: "scanning",
            message: "Failed to access target project directory",
            context: {
              reason: "Permission denied",
            },
          },
        ],
        result: {
          discoveredToolsCount: 0,
          summary: {
            filesScanned: 10,
            filesWithToolImports: 0,
            toolsDiscovered: 0,
            filesGenerated: 0,
            skippedFiles: [],
          },
          error: "Permission denied: unable to read target project directory",
        },
      };

      // TODO: Remove eslint-disable once implementation is complete

      vi.mocked(projectConfigService.getDiscoveryStatus).mockResolvedValue(
        mockStatus,
      );

      const res = await app.request("/api/project/discovery/status");
      const json = (await res.json()) as DiscoveryStatus;

      expect(res.status).toBe(200);
      expect(json.isDiscovering).toBe(false);
      expect(json.phase).toBe("error");
      expect(json.result?.error).toBeDefined();
      if (json.result?.error) {
        expect(json.result.error).toContain("Permission denied");
      }
      expect(json.logs[0]?.level).toBe("error");
    });
  });

  describe("Response schema validation", () => {
    it("should ensure response matches DiscoveryStatus schema with all required fields", async () => {
      const mockStatus: DiscoveryStatus = {
        isDiscovering: true,
        phase: "scanning",
        progress: {
          filesScanned: 10,
          filesAnalyzed: 0,
          toolsFound: 0,
          filesGenerated: 0,
        },
        logs: [],
      };

      // TODO: Remove eslint-disable once implementation is complete

      vi.mocked(projectConfigService.getDiscoveryStatus).mockResolvedValue(
        mockStatus,
      );

      const res = await app.request("/api/project/discovery/status");
      const json = (await res.json()) as DiscoveryStatus;

      expect(typeof json.isDiscovering).toBe("boolean");
      expect(typeof json.phase).toBe("string");
      expect([
        "idle",
        "scanning",
        "analyzing",
        "generating",
        "complete",
        "error",
      ]).toContain(json.phase);
      expect(Array.isArray(json.logs)).toBe(true);

      if (json.progress) {
        expect(typeof json.progress.filesScanned).toBe("number");
        expect(typeof json.progress.filesAnalyzed).toBe("number");
        expect(typeof json.progress.toolsFound).toBe("number");
        expect(typeof json.progress.filesGenerated).toBe("number");
      }

      if (json.result) {
        expect(typeof json.result.discoveredToolsCount).toBe("number");
        expect(json.result.summary).toBeDefined();
        expect(typeof json.result.summary.filesScanned).toBe("number");
        expect(typeof json.result.summary.toolsDiscovered).toBe("number");
        expect(Array.isArray(json.result.summary.skippedFiles)).toBe(true);
      }
    });

    it("should validate log entry structure when logs are present", async () => {
      const mockStatus: DiscoveryStatus = {
        isDiscovering: true,
        phase: "analyzing",
        progress: {
          filesScanned: 50,
          filesAnalyzed: 10,
          toolsFound: 2,
          filesGenerated: 0,
        },
        logs: [
          {
            timestamp: "2025-11-10T10:00:00Z",
            level: "info",
            phase: "analyzing",
            message: "Test log entry",
            context: {
              filePath: "test.ts",
              toolName: "testTool",
            },
          },
        ],
      };

      // TODO: Remove eslint-disable once implementation is complete

      vi.mocked(projectConfigService.getDiscoveryStatus).mockResolvedValue(
        mockStatus,
      );

      const res = await app.request("/api/project/discovery/status");
      const json = (await res.json()) as DiscoveryStatus;

      expect(json.logs).toHaveLength(1);
      const logEntry = json.logs[0];
      expect(logEntry).toBeDefined();
      if (logEntry) {
        expect(typeof logEntry.timestamp).toBe("string");
        expect(["info", "warning", "error"]).toContain(logEntry.level);
        expect(["scanning", "analyzing", "generating", "complete"]).toContain(
          logEntry.phase,
        );
        expect(typeof logEntry.message).toBe("string");

        if (logEntry.context) {
          if (logEntry.context.filePath) {
            expect(typeof logEntry.context.filePath).toBe("string");
          }
          if (logEntry.context.toolName) {
            expect(typeof logEntry.context.toolName).toBe("string");
          }
          if (logEntry.context.detectedParams) {
            expect(Array.isArray(logEntry.context.detectedParams)).toBe(true);
          }
        }
      }
    });
  });

  describe("Incremental log updates", () => {
    it("should return only new log entries since last poll", async () => {
      const mockStatus: DiscoveryStatus = {
        isDiscovering: true,
        phase: "scanning",
        progress: {
          filesScanned: 100,
          filesAnalyzed: 0,
          toolsFound: 0,
          filesGenerated: 0,
        },
        logs: [
          {
            timestamp: "2025-11-10T10:00:05Z",
            level: "info",
            phase: "scanning",
            message: "New log entry since last poll",
          },
        ],
      };

      // TODO: Remove eslint-disable once implementation is complete

      vi.mocked(projectConfigService.getDiscoveryStatus).mockResolvedValue(
        mockStatus,
      );

      const res = await app.request("/api/project/discovery/status");
      const json = (await res.json()) as DiscoveryStatus;

      expect(res.status).toBe(200);
      expect(json.logs).toHaveLength(1);
      expect(json.logs[0]?.message).toBe("New log entry since last poll");
    });
  });
});

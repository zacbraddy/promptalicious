import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  UpdateProjectConfigurationRequest,
  UpdateProjectConfigurationSuccessResponse,
  UpdateProjectConfigurationErrorResponse,
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
        projectConfigService.updateProjectConfiguration,
      ).toHaveBeenCalledWith({
        name: "test-project",
        targetProjectPath: "../test-project",
      });

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

      expect(projectConfigService.startDiscovery).toHaveBeenCalledTimes(1);
    });
  });
});

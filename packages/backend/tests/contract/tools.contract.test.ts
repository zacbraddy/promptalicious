import { describe, it, expect, vi, beforeEach } from "vitest";

import app from "@/app";

// @ts-expect-error - RED phase: service not implemented yet
import * as toolsService from "@/services/tools.service";

vi.mock("@/services/tools.service", () => ({
  getTools: vi.fn(),
  getTool: vi.fn(),
  updateTool: vi.fn(),
}));

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

describe("GET /api/tools endpoint contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Success response (200)", () => {
    it("should return 200 with tools array when tools are discovered", async () => {
      const mockTools = [
        {
          id: "getUserProfile",
          name: "getUserProfile",
          description: "Fetches user profile data from the database",
          sourceDescription: "Get user profile by ID",
          enabled: true,
          createdAt: new Date("2025-01-10T00:00:00.000Z"),
          updatedAt: new Date("2025-01-10T00:00:00.000Z"),
        },
        {
          id: "getWeather",
          name: "getWeather",
          description: "Get current weather for a location",
          sourceDescription: "Get current weather for a location",
          enabled: false,
          createdAt: new Date("2025-01-10T01:00:00.000Z"),
          updatedAt: new Date("2025-01-10T01:00:00.000Z"),
        },
      ];

      vi.mocked(toolsService.getTools).mockResolvedValue(mockTools);

      const res = await app.request("/api/tools");
      const json = (await res.json()) as { tools: typeof mockTools };

      expect(res.status).toBe(200);
      expect(json.tools).toBeDefined();
      expect(Array.isArray(json.tools)).toBe(true);
      expect(json.tools).toHaveLength(2);
      expect(json.tools[0]).toEqual({
        id: "getUserProfile",
        name: "getUserProfile",
        description: "Fetches user profile data from the database",
        sourceDescription: "Get user profile by ID",
        enabled: true,
        createdAt: "2025-01-10T00:00:00.000Z",
        updatedAt: "2025-01-10T00:00:00.000Z",
      });
    });

    it("should return 200 with empty tools array when no tools discovered", async () => {
      vi.mocked(toolsService.getTools).mockResolvedValue([]);

      const res = await app.request("/api/tools");
      const json = (await res.json()) as { tools: unknown[] };

      expect(res.status).toBe(200);
      expect(json.tools).toBeDefined();
      expect(Array.isArray(json.tools)).toBe(true);
      expect(json.tools).toHaveLength(0);
    });

    it("should return tools with all required fields matching schema", async () => {
      const mockTools = [
        {
          id: "testTool",
          name: "testTool",
          description: "Test tool description",
          sourceDescription: "Original description",
          enabled: true,
          createdAt: new Date("2025-01-10T10:30:00.000Z"),
          updatedAt: new Date("2025-01-10T14:45:00.000Z"),
        },
      ];

      vi.mocked(toolsService.getTools).mockResolvedValue(mockTools);

      const res = await app.request("/api/tools");
      const json = (await res.json()) as { tools: typeof mockTools };

      expect(res.status).toBe(200);
      const tool = json.tools[0];
      expect(tool).toBeDefined();
      expect(typeof tool?.id).toBe("string");
      expect(tool?.id.length).toBeGreaterThan(0);
      expect(typeof tool?.name).toBe("string");
      expect(tool?.name.length).toBeGreaterThan(0);
      expect(typeof tool?.description).toBe("string");
      expect(tool?.description.length).toBeGreaterThan(0);
      expect(typeof tool?.enabled).toBe("boolean");
      expect(typeof tool?.createdAt).toBe("string");
      if (tool?.createdAt) {
        expect(new Date(tool.createdAt).toISOString()).toBe(tool.createdAt);
      }
      expect(typeof tool?.updatedAt).toBe("string");
      if (tool?.updatedAt) {
        expect(new Date(tool.updatedAt).toISOString()).toBe(tool.updatedAt);
      }
    });

    it("should handle sourceDescription as nullable field", async () => {
      const mockToolsWithNullSource = [
        {
          id: "toolWithoutSource",
          name: "toolWithoutSource",
          description: "Updated description",
          sourceDescription: null,
          enabled: true,
          createdAt: new Date("2025-01-10T00:00:00.000Z"),
          updatedAt: new Date("2025-01-10T01:00:00.000Z"),
        },
      ];

      vi.mocked(toolsService.getTools).mockResolvedValue(
        mockToolsWithNullSource,
      );

      const res = await app.request("/api/tools");
      const json = (await res.json()) as {
        tools: typeof mockToolsWithNullSource;
      };

      expect(res.status).toBe(200);
      expect(json.tools[0]?.sourceDescription).toBeNull();
    });
  });

  describe("Not found response (404)", () => {
    it("should return 404 when no project is configured", async () => {
      vi.mocked(toolsService.getTools).mockRejectedValue(
        new Error("No project configured"),
      );

      const res = await app.request("/api/tools");
      const json = (await res.json()) as {
        error: string;
        message: string;
      };

      expect(res.status).toBe(404);
      expect(json.error).toBeDefined();
      expect(json.error).toBe("not_found");
      expect(json.message).toContain("No project configured");
    });

    it("should return standard error schema in 404 response", async () => {
      vi.mocked(toolsService.getTools).mockRejectedValue(
        new Error("No project configured"),
      );

      const res = await app.request("/api/tools");
      const json = (await res.json()) as {
        error: string;
        message: string;
      };

      expect(res.status).toBe(404);
      expect(typeof json.error).toBe("string");
      expect(typeof json.message).toBe("string");
      expect(json.message.length).toBeGreaterThan(0);
    });
  });

  describe("Response consistency", () => {
    it("should return same tools array for multiple GET requests", async () => {
      const mockTools = [
        {
          id: "consistentTool",
          name: "consistentTool",
          description: "Consistent tool",
          sourceDescription: "Original",
          enabled: true,
          createdAt: new Date("2025-01-10T00:00:00.000Z"),
          updatedAt: new Date("2025-01-10T00:00:00.000Z"),
        },
      ];

      vi.mocked(toolsService.getTools).mockResolvedValue(mockTools);

      const res1 = await app.request("/api/tools");
      const json1 = (await res1.json()) as { tools: typeof mockTools };

      const res2 = await app.request("/api/tools");
      const json2 = (await res2.json()) as { tools: typeof mockTools };

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(json1.tools).toEqual(json2.tools);
    });
  });
});

describe("GET /api/tools/:id endpoint contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Success response (200)", () => {
    it("should return 200 with ToolDetail when tool found", async () => {
      const mockToolDetail = {
        id: "getUserProfile",
        name: "getUserProfile",
        description: "Fetches user profile data from the database",
        sourceDescription: "Get user profile by ID",
        parametersSchema: {
          type: "object",
          properties: {
            userId: { type: "string" },
          },
          required: ["userId"],
        },
        sourceFilePath: "/path/to/user/project/src/tools/getUserProfile.ts",
        workspaceDir: "workspace/my-project/getUserProfile",
        enabled: true,
        detectedHookParams: ["db", "authService"],
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T00:00:00.000Z"),
      };

      vi.mocked(toolsService.getTool).mockResolvedValue(mockToolDetail);

      const res = await app.request("/api/tools/getUserProfile");
      const json = (await res.json()) as { tool: typeof mockToolDetail };

      expect(res.status).toBe(200);
      expect(json.tool).toBeDefined();
      expect(json.tool.id).toBe("getUserProfile");
      expect(json.tool.parametersSchema).toEqual({
        type: "object",
        properties: {
          userId: { type: "string" },
        },
        required: ["userId"],
      });
      expect(json.tool.sourceFilePath).toBe(
        "/path/to/user/project/src/tools/getUserProfile.ts",
      );
      expect(json.tool.workspaceDir).toBe(
        "workspace/my-project/getUserProfile",
      );
      expect(json.tool.detectedHookParams).toEqual(["db", "authService"]);
    });

    it("should return ToolDetail with all required fields matching schema", async () => {
      const mockToolDetail = {
        id: "testTool",
        name: "testTool",
        description: "Test tool description",
        sourceDescription: "Original description",
        parametersSchema: {
          type: "object",
          properties: {},
        },
        sourceFilePath: "/path/to/source/testTool.ts",
        workspaceDir: "workspace/test-project/testTool",
        enabled: false,
        detectedHookParams: ["context", "logger"],
        createdAt: new Date("2025-01-10T10:30:00.000Z"),
        updatedAt: new Date("2025-01-10T14:45:00.000Z"),
      };

      vi.mocked(toolsService.getTool).mockResolvedValue(mockToolDetail);

      const res = await app.request("/api/tools/testTool");
      const json = (await res.json()) as { tool: typeof mockToolDetail };

      expect(res.status).toBe(200);
      const tool = json.tool;
      expect(tool).toBeDefined();
      expect(typeof tool.id).toBe("string");
      expect(tool.id.length).toBeGreaterThan(0);
      expect(typeof tool.name).toBe("string");
      expect(tool.name.length).toBeGreaterThan(0);
      expect(typeof tool.description).toBe("string");
      expect(tool.description.length).toBeGreaterThan(0);
      expect(typeof tool.parametersSchema).toBe("object");
      expect(typeof tool.sourceFilePath).toBe("string");
      expect(tool.sourceFilePath.length).toBeGreaterThan(0);
      expect(typeof tool.workspaceDir).toBe("string");
      expect(tool.workspaceDir.length).toBeGreaterThan(0);
      expect(typeof tool.enabled).toBe("boolean");
      expect(Array.isArray(tool.detectedHookParams)).toBe(true);
      expect(typeof tool.createdAt).toBe("string");
      expect(new Date(tool.createdAt).toISOString()).toBe(tool.createdAt);
      expect(typeof tool.updatedAt).toBe("string");
      expect(new Date(tool.updatedAt).toISOString()).toBe(tool.updatedAt);
    });

    it("should handle sourceDescription as nullable field in detail view", async () => {
      const mockToolDetail = {
        id: "editedTool",
        name: "editedTool",
        description: "Updated description from frontend",
        sourceDescription: null,
        parametersSchema: {
          type: "object",
          properties: {
            input: { type: "string" },
          },
        },
        sourceFilePath: "/path/to/source/editedTool.ts",
        workspaceDir: "workspace/my-project/editedTool",
        enabled: true,
        detectedHookParams: [],
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T01:00:00.000Z"),
      };

      vi.mocked(toolsService.getTool).mockResolvedValue(mockToolDetail);

      const res = await app.request("/api/tools/editedTool");
      const json = (await res.json()) as { tool: typeof mockToolDetail };

      expect(res.status).toBe(200);
      expect(json.tool.sourceDescription).toBeNull();
    });

    it("should handle empty detectedHookParams array", async () => {
      const mockToolDetail = {
        id: "simpleTool",
        name: "simpleTool",
        description: "Simple tool with no external dependencies",
        sourceDescription: "Original simple description",
        parametersSchema: {
          type: "object",
          properties: {},
        },
        sourceFilePath: "/path/to/source/simpleTool.ts",
        workspaceDir: "workspace/my-project/simpleTool",
        enabled: true,
        detectedHookParams: [],
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T00:00:00.000Z"),
      };

      vi.mocked(toolsService.getTool).mockResolvedValue(mockToolDetail);

      const res = await app.request("/api/tools/simpleTool");
      const json = (await res.json()) as { tool: typeof mockToolDetail };

      expect(res.status).toBe(200);
      expect(json.tool.detectedHookParams).toEqual([]);
      expect(Array.isArray(json.tool.detectedHookParams)).toBe(true);
    });
  });

  describe("Not found response (404)", () => {
    it("should return 404 when tool not found", async () => {
      vi.mocked(toolsService.getTool).mockResolvedValue(null);

      const res = await app.request("/api/tools/nonExistentTool");
      const json = (await res.json()) as {
        error: string;
        message: string;
      };

      expect(res.status).toBe(404);
      expect(json.error).toBeDefined();
      expect(json.error).toBe("not_found");
      expect(json.message).toContain("Tool not found");
    });

    it("should return standard error schema in 404 response", async () => {
      vi.mocked(toolsService.getTool).mockResolvedValue(null);

      const res = await app.request("/api/tools/missingTool");
      const json = (await res.json()) as {
        error: string;
        message: string;
      };

      expect(res.status).toBe(404);
      expect(typeof json.error).toBe("string");
      expect(typeof json.message).toBe("string");
      expect(json.message.length).toBeGreaterThan(0);
    });
  });
});

describe("PATCH /api/tools/:id endpoint contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Success response (200)", () => {
    it("should return 200 with updated tool when description is changed", async () => {
      const mockUpdatedTool = {
        id: "getUserProfile",
        name: "getUserProfile",
        description: "Updated description from frontend",
        sourceDescription: null,
        parametersSchema: {
          type: "object",
          properties: {
            userId: { type: "string" },
          },
          required: ["userId"],
        },
        sourceFilePath: "/path/to/user/project/src/tools/getUserProfile.ts",
        workspaceDir: "workspace/my-project/getUserProfile",
        enabled: true,
        detectedHookParams: ["db", "authService"],
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T02:00:00.000Z"),
      };

      vi.mocked(toolsService.updateTool).mockResolvedValue(mockUpdatedTool);

      const res = await app.request("/api/tools/getUserProfile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: "Updated description from frontend",
        }),
      });
      const json = (await res.json()) as { tool: typeof mockUpdatedTool };

      expect(res.status).toBe(200);
      expect(json.tool).toBeDefined();
      expect(json.tool.description).toBe("Updated description from frontend");
      expect(json.tool.sourceDescription).toBeNull();
      expect(json.tool.updatedAt).not.toBe(
        mockUpdatedTool.createdAt.toISOString(),
      );
    });

    it("should return 200 with updated tool when enabled status is changed", async () => {
      const mockUpdatedTool = {
        id: "getWeather",
        name: "getWeather",
        description: "Get current weather for a location",
        sourceDescription: "Get current weather for a location",
        parametersSchema: {
          type: "object",
          properties: {
            location: { type: "string" },
          },
        },
        sourceFilePath: "/path/to/user/project/src/tools/getWeather.ts",
        workspaceDir: "workspace/my-project/getWeather",
        enabled: true,
        detectedHookParams: [],
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T02:00:00.000Z"),
      };

      vi.mocked(toolsService.updateTool).mockResolvedValue(mockUpdatedTool);

      const res = await app.request("/api/tools/getWeather", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: true,
        }),
      });
      const json = (await res.json()) as { tool: typeof mockUpdatedTool };

      expect(res.status).toBe(200);
      expect(json.tool).toBeDefined();
      expect(json.tool.enabled).toBe(true);
    });

    it("should return 200 when disabling a tool", async () => {
      const mockUpdatedTool = {
        id: "getWeather",
        name: "getWeather",
        description: "Get current weather for a location",
        sourceDescription: "Get current weather for a location",
        parametersSchema: {
          type: "object",
          properties: {
            location: { type: "string" },
          },
        },
        sourceFilePath: "/path/to/user/project/src/tools/getWeather.ts",
        workspaceDir: "workspace/my-project/getWeather",
        enabled: false,
        detectedHookParams: [],
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T02:00:00.000Z"),
      };

      vi.mocked(toolsService.updateTool).mockResolvedValue(mockUpdatedTool);

      const res = await app.request("/api/tools/getWeather", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: false,
        }),
      });
      const json = (await res.json()) as { tool: typeof mockUpdatedTool };

      expect(res.status).toBe(200);
      expect(json.tool).toBeDefined();
      expect(json.tool.enabled).toBe(false);
    });

    it("should return 200 when updating both description and enabled status", async () => {
      const mockUpdatedTool = {
        id: "processData",
        name: "processData",
        description: "New description",
        sourceDescription: null,
        parametersSchema: {
          type: "object",
          properties: {
            data: { type: "string" },
          },
        },
        sourceFilePath: "/path/to/user/project/src/tools/processData.ts",
        workspaceDir: "workspace/my-project/processData",
        enabled: false,
        detectedHookParams: ["processor"],
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T02:00:00.000Z"),
      };

      vi.mocked(toolsService.updateTool).mockResolvedValue(mockUpdatedTool);

      const res = await app.request("/api/tools/processData", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: "New description",
          enabled: false,
        }),
      });
      const json = (await res.json()) as { tool: typeof mockUpdatedTool };

      expect(res.status).toBe(200);
      expect(json.tool).toBeDefined();
      expect(json.tool.description).toBe("New description");
      expect(json.tool.sourceDescription).toBeNull();
      expect(json.tool.enabled).toBe(false);
    });

    it("should return updated tool with all required fields matching ToolDetail schema", async () => {
      const mockUpdatedTool = {
        id: "testTool",
        name: "testTool",
        description: "Updated test description",
        sourceDescription: null,
        parametersSchema: {
          type: "object",
          properties: {
            param1: { type: "string" },
          },
        },
        sourceFilePath: "/path/to/source/testTool.ts",
        workspaceDir: "workspace/test-project/testTool",
        enabled: true,
        detectedHookParams: ["context"],
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T03:00:00.000Z"),
      };

      vi.mocked(toolsService.updateTool).mockResolvedValue(mockUpdatedTool);

      const res = await app.request("/api/tools/testTool", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: "Updated test description",
        }),
      });
      const json = (await res.json()) as { tool: typeof mockUpdatedTool };

      expect(res.status).toBe(200);
      const tool = json.tool;
      expect(tool).toBeDefined();
      expect(typeof tool.id).toBe("string");
      expect(tool.id.length).toBeGreaterThan(0);
      expect(typeof tool.name).toBe("string");
      expect(typeof tool.description).toBe("string");
      expect(typeof tool.parametersSchema).toBe("object");
      expect(typeof tool.sourceFilePath).toBe("string");
      expect(typeof tool.workspaceDir).toBe("string");
      expect(typeof tool.enabled).toBe("boolean");
      expect(Array.isArray(tool.detectedHookParams)).toBe(true);
      expect(typeof tool.createdAt).toBe("string");
      expect(new Date(tool.createdAt).toISOString()).toBe(tool.createdAt);
      expect(typeof tool.updatedAt).toBe("string");
      expect(new Date(tool.updatedAt).toISOString()).toBe(tool.updatedAt);
    });

    it("should preserve sourceDescription when only enabled status is updated", async () => {
      const mockUpdatedTool = {
        id: "preserveSource",
        name: "preserveSource",
        description: "Original description",
        sourceDescription: "Original description",
        parametersSchema: {
          type: "object",
          properties: {},
        },
        sourceFilePath: "/path/to/source/preserveSource.ts",
        workspaceDir: "workspace/my-project/preserveSource",
        enabled: false,
        detectedHookParams: [],
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T01:00:00.000Z"),
      };

      vi.mocked(toolsService.updateTool).mockResolvedValue(mockUpdatedTool);

      const res = await app.request("/api/tools/preserveSource", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: false,
        }),
      });
      const json = (await res.json()) as { tool: typeof mockUpdatedTool };

      expect(res.status).toBe(200);
      expect(json.tool.sourceDescription).toBe("Original description");
      expect(json.tool.sourceDescription).not.toBeNull();
    });
  });

  describe("Not found response (404)", () => {
    it("should return 404 when tool not found", async () => {
      vi.mocked(toolsService.updateTool).mockResolvedValue(null);

      const res = await app.request("/api/tools/nonExistentTool", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: "Updated description",
        }),
      });
      const json = (await res.json()) as {
        error: string;
        message: string;
      };

      expect(res.status).toBe(404);
      expect(json.error).toBeDefined();
      expect(json.error).toBe("not_found");
      expect(json.message).toContain("Tool not found");
    });

    it("should return standard error schema in 404 response", async () => {
      vi.mocked(toolsService.updateTool).mockResolvedValue(null);

      const res = await app.request("/api/tools/missingTool", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: false,
        }),
      });
      const json = (await res.json()) as {
        error: string;
        message: string;
      };

      expect(res.status).toBe(404);
      expect(typeof json.error).toBe("string");
      expect(typeof json.message).toBe("string");
      expect(json.message.length).toBeGreaterThan(0);
    });
  });

  describe("Request validation", () => {
    it("should handle empty request body", async () => {
      const mockUpdatedTool = {
        id: "unchangedTool",
        name: "unchangedTool",
        description: "Original description",
        sourceDescription: "Original description",
        parametersSchema: {
          type: "object",
          properties: {},
        },
        sourceFilePath: "/path/to/source/unchangedTool.ts",
        workspaceDir: "workspace/my-project/unchangedTool",
        enabled: true,
        detectedHookParams: [],
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        updatedAt: new Date("2025-01-10T00:00:00.000Z"),
      };

      vi.mocked(toolsService.updateTool).mockResolvedValue(mockUpdatedTool);

      const res = await app.request("/api/tools/unchangedTool", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as { tool: typeof mockUpdatedTool };

      expect(res.status).toBe(200);
      expect(json.tool).toBeDefined();
    });
  });
});

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

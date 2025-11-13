import { describe, it, expect, vi, beforeEach } from "vitest";

import app from "@/app";
import * as exportService from "@/services/export.service";

vi.mock("@/services/export.service", () => ({
  generateExportInstructions: vi.fn(),
}));

describe("POST /api/export endpoint contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Success response (200)", () => {
    it("should return 200 with export instructions when tools are configured", async () => {
      const mockExportResponse = {
        markdown: `# Export Instructions

Generated: 2025-11-10T15:30:00Z

## Changes Summary
- 3 tools configured
- 2 tools enabled
- AI SDK options customised

## Step 1: Update Tool Definitions
...`,
        generatedAt: new Date("2025-11-10T15:30:00.000Z"),
        toolsIncluded: 2,
        advancedOptions: {
          temperature: 1.0,
          maxTokens: 4096,
          toolChoice: "auto",
          maxToolRoundtrips: 10,
        },
      };

      vi.mocked(exportService.generateExportInstructions).mockResolvedValue(
        mockExportResponse,
      );

      const res = await app.request("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeDisabledTools: false,
        }),
      });
      const json = (await res.json()) as typeof mockExportResponse;

      expect(res.status).toBe(200);
      expect(json.markdown).toBeDefined();
      expect(typeof json.markdown).toBe("string");
      expect(json.markdown.length).toBeGreaterThan(0);
      expect(json.markdown).toContain("Export Instructions");
      expect(json.generatedAt).toBeDefined();
      expect(typeof json.generatedAt).toBe("string");
      expect(json.toolsIncluded).toBeDefined();
      expect(typeof json.toolsIncluded).toBe("number");
      expect(json.toolsIncluded).toBeGreaterThanOrEqual(0);
      expect(json.advancedOptions).toBeDefined();
      expect(typeof json.advancedOptions).toBe("object");
    });

    it("should return markdown with all required sections", async () => {
      const mockExportResponse = {
        markdown: `# Export Instructions

Generated: 2025-11-10T15:30:00Z

## Changes Summary
- 1 tool configured

## Step 1: Update Tool Definitions

### Tool: getUserProfile

## Step 2: Update AI SDK Call

## Step 3: Refactoring Checklist`,
        generatedAt: new Date("2025-11-10T15:30:00.000Z"),
        toolsIncluded: 1,
        advancedOptions: {
          toolChoice: "auto",
        },
      };

      vi.mocked(exportService.generateExportInstructions).mockResolvedValue(
        mockExportResponse,
      );

      const res = await app.request("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeDisabledTools: false,
        }),
      });
      const json = (await res.json()) as typeof mockExportResponse;

      expect(res.status).toBe(200);
      expect(json.markdown).toContain("Export Instructions");
      expect(json.markdown).toContain("Changes Summary");
      expect(json.markdown).toContain("Update Tool Definitions");
      expect(json.markdown).toContain("Update AI SDK Call");
      expect(json.markdown).toContain("Refactoring Checklist");
    });

    it("should accept includeDisabledTools parameter", async () => {
      const mockExportResponse = {
        markdown: "# Export Instructions\n\nWith disabled tools included",
        generatedAt: new Date("2025-11-10T15:30:00.000Z"),
        toolsIncluded: 3,
        advancedOptions: {},
      };

      vi.mocked(exportService.generateExportInstructions).mockResolvedValue(
        mockExportResponse,
      );

      const res = await app.request("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeDisabledTools: true,
        }),
      });

      expect(res.status).toBe(200);
      expect(exportService.generateExportInstructions).toHaveBeenCalledWith({
        includeDisabledTools: true,
      });
    });

    it("should default includeDisabledTools to false when not provided", async () => {
      const mockExportResponse = {
        markdown: "# Export Instructions\n\nOnly enabled tools",
        generatedAt: new Date("2025-11-10T15:30:00.000Z"),
        toolsIncluded: 2,
        advancedOptions: {},
      };

      vi.mocked(exportService.generateExportInstructions).mockResolvedValue(
        mockExportResponse,
      );

      const res = await app.request("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      expect(exportService.generateExportInstructions).toHaveBeenCalledWith({
        includeDisabledTools: false,
      });
    });

    it("should return response with all required fields matching schema", async () => {
      const mockExportResponse = {
        markdown: "# Export Instructions\n\nGenerated content",
        generatedAt: new Date("2025-11-10T15:30:00.000Z"),
        toolsIncluded: 2,
        advancedOptions: {
          temperature: 0.7,
          maxTokens: 2048,
          toolChoice: "required",
          maxToolRoundtrips: 5,
          topP: 0.9,
          maxRetries: 3,
        },
      };

      vi.mocked(exportService.generateExportInstructions).mockResolvedValue(
        mockExportResponse,
      );

      const res = await app.request("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeDisabledTools: false,
        }),
      });
      const json = (await res.json()) as typeof mockExportResponse;

      expect(res.status).toBe(200);
      expect(typeof json.markdown).toBe("string");
      expect(json.markdown.length).toBeGreaterThan(0);
      expect(typeof json.generatedAt).toBe("string");
      expect(new Date(json.generatedAt).toISOString()).toBe(json.generatedAt);
      expect(typeof json.toolsIncluded).toBe("number");
      expect(json.toolsIncluded).toBeGreaterThanOrEqual(0);
      expect(typeof json.advancedOptions).toBe("object");
      expect(json.advancedOptions).not.toBeNull();
    });

    it("should return empty advancedOptions object when no options configured", async () => {
      const mockExportResponse = {
        markdown: "# Export Instructions\n\nNo advanced options",
        generatedAt: new Date("2025-11-10T15:30:00.000Z"),
        toolsIncluded: 1,
        advancedOptions: {},
      };

      vi.mocked(exportService.generateExportInstructions).mockResolvedValue(
        mockExportResponse,
      );

      const res = await app.request("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeDisabledTools: false,
        }),
      });
      const json = (await res.json()) as typeof mockExportResponse;

      expect(res.status).toBe(200);
      expect(json.advancedOptions).toEqual({});
    });

    it("should return toolsIncluded count of 0 when only disabled tools exist and includeDisabledTools is false", async () => {
      const mockExportResponse = {
        markdown:
          "# Export Instructions\n\nNo enabled tools (all tools disabled)",
        generatedAt: new Date("2025-11-10T15:30:00.000Z"),
        toolsIncluded: 0,
        advancedOptions: {},
      };

      vi.mocked(exportService.generateExportInstructions).mockResolvedValue(
        mockExportResponse,
      );

      const res = await app.request("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeDisabledTools: false,
        }),
      });
      const json = (await res.json()) as typeof mockExportResponse;

      expect(res.status).toBe(200);
      expect(json.toolsIncluded).toBe(0);
    });
  });

  describe("Not found response (404)", () => {
    it("should return 404 when no tools are configured", async () => {
      vi.mocked(exportService.generateExportInstructions).mockRejectedValue(
        new Error("No tools configured"),
      );

      const res = await app.request("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeDisabledTools: false,
        }),
      });
      const json = (await res.json()) as {
        error: string;
        message: string;
      };

      expect(res.status).toBe(404);
      expect(json.error).toBeDefined();
      expect(json.error).toBe("not_found");
      expect(json.message).toContain("No tools configured");
    });

    it("should return 404 when no project is configured", async () => {
      vi.mocked(exportService.generateExportInstructions).mockRejectedValue(
        new Error("No project configured"),
      );

      const res = await app.request("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeDisabledTools: false,
        }),
      });
      const json = (await res.json()) as {
        error: string;
        message: string;
      };

      expect(res.status).toBe(404);
      expect(json.error).toBeDefined();
      expect(json.error).toBe("not_found");
      expect(json.message).toBeDefined();
      expect(json.message.length).toBeGreaterThan(0);
    });

    it("should return standard error schema in 404 response", async () => {
      vi.mocked(exportService.generateExportInstructions).mockRejectedValue(
        new Error("No tools configured"),
      );

      const res = await app.request("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeDisabledTools: false,
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
    it("should handle missing Content-Type header", async () => {
      const mockExportResponse = {
        markdown: "# Export Instructions\n\nContent",
        generatedAt: new Date("2025-11-10T15:30:00.000Z"),
        toolsIncluded: 1,
        advancedOptions: {},
      };

      vi.mocked(exportService.generateExportInstructions).mockResolvedValue(
        mockExportResponse,
      );

      const res = await app.request("/api/export", {
        method: "POST",
        body: JSON.stringify({
          includeDisabledTools: false,
        }),
      });

      expect(res.status).toBe(200);
    });

    it("should handle empty request body as includeDisabledTools: false", async () => {
      const mockExportResponse = {
        markdown: "# Export Instructions\n\nContent",
        generatedAt: new Date("2025-11-10T15:30:00.000Z"),
        toolsIncluded: 1,
        advancedOptions: {},
      };

      vi.mocked(exportService.generateExportInstructions).mockResolvedValue(
        mockExportResponse,
      );

      const res = await app.request("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      expect(exportService.generateExportInstructions).toHaveBeenCalledWith({
        includeDisabledTools: false,
      });
    });
  });

  describe("Response consistency", () => {
    it("should return same export instructions for identical consecutive requests", async () => {
      const mockExportResponse = {
        markdown: "# Export Instructions\n\nConsistent content",
        generatedAt: new Date("2025-11-10T15:30:00.000Z"),
        toolsIncluded: 2,
        advancedOptions: {
          temperature: 1.0,
        },
      };

      vi.mocked(exportService.generateExportInstructions).mockResolvedValue(
        mockExportResponse,
      );

      const res1 = await app.request("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeDisabledTools: false,
        }),
      });
      const json1 = (await res1.json()) as typeof mockExportResponse;

      const res2 = await app.request("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeDisabledTools: false,
        }),
      });
      const json2 = (await res2.json()) as typeof mockExportResponse;

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(json1.markdown).toBe(json2.markdown);
      expect(json1.toolsIncluded).toBe(json2.toolsIncluded);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

import app from "@/app";
import * as projectConfigService from "@/services/project-configuration.service";

vi.mock("@/services/project-configuration.service", () => ({
  getProjectConfiguration: vi.fn(),
  updateProjectConfiguration: vi.fn(),
  startDiscovery: vi.fn(),
  getDiscoveryStatus: vi.fn(),
  cancelDiscovery: vi.fn(),
}));

describe("POST /api/project/discovery/cancel endpoint contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Success response (200)", () => {
    it("should return 200 with cancelled: true when discovery is in progress", async () => {
      vi.mocked(projectConfigService.cancelDiscovery).mockResolvedValue({
        cancelled: true,
        message: "Discovery cancelled, workspace cleaned up",
      });

      const res = await app.request("/api/project/discovery/cancel", {
        method: "POST",
      });

      const json = (await res.json()) as {
        cancelled: boolean;
        message: string;
      };

      expect(res.status).toBe(200);
      expect(json.cancelled).toBe(true);
      expect(json.message).toBe("Discovery cancelled, workspace cleaned up");

      expect(projectConfigService.cancelDiscovery).toHaveBeenCalledTimes(1);
    });

    it("should confirm workspace cleanup in success message", async () => {
      vi.mocked(projectConfigService.cancelDiscovery).mockResolvedValue({
        cancelled: true,
        message: "Discovery cancelled, workspace cleaned up",
      });

      const res = await app.request("/api/project/discovery/cancel", {
        method: "POST",
      });

      const json = (await res.json()) as {
        cancelled: boolean;
        message: string;
      };

      expect(res.status).toBe(200);
      expect(json.message).toContain("cleaned up");
    });
  });

  describe("Error responses (404)", () => {
    it("should return 404 when no discovery is in progress", async () => {
      vi.mocked(projectConfigService.cancelDiscovery).mockResolvedValue({
        cancelled: false,
        message: "No discovery in progress",
      });

      const res = await app.request("/api/project/discovery/cancel", {
        method: "POST",
      });

      const json = (await res.json()) as {
        error: {
          errorType: string;
          errorMessage: string;
        };
      };

      expect(res.status).toBe(404);
      expect(json.error).toBeDefined();
      expect(json.error.errorType).toBe("not_found");
      expect(json.error.errorMessage).toContain("No discovery in progress");
    });

    it("should not clean up workspace when no discovery is in progress", async () => {
      vi.mocked(projectConfigService.cancelDiscovery).mockResolvedValue({
        cancelled: false,
        message: "No discovery in progress",
      });

      const res = await app.request("/api/project/discovery/cancel", {
        method: "POST",
      });

      expect(res.status).toBe(404);

      expect(projectConfigService.cancelDiscovery).toHaveBeenCalledTimes(1);
    });
  });

  describe("Response schema validation", () => {
    it("should ensure success response has required fields with correct types", async () => {
      vi.mocked(projectConfigService.cancelDiscovery).mockResolvedValue({
        cancelled: true,
        message: "Discovery cancelled, workspace cleaned up",
      });

      const res = await app.request("/api/project/discovery/cancel", {
        method: "POST",
      });

      const json = (await res.json()) as {
        cancelled: boolean;
        message: string;
      };

      expect(typeof json.cancelled).toBe("boolean");
      expect(json.cancelled).toBe(true);
      expect(typeof json.message).toBe("string");
      expect(json.message.length).toBeGreaterThan(0);
    });

    it("should ensure error response follows standard error schema", async () => {
      vi.mocked(projectConfigService.cancelDiscovery).mockResolvedValue({
        cancelled: false,
        message: "No discovery in progress",
      });

      const res = await app.request("/api/project/discovery/cancel", {
        method: "POST",
      });

      const json = (await res.json()) as {
        error: {
          errorType: string;
          errorMessage: string;
        };
      };

      expect(json.error).toBeDefined();
      expect(typeof json.error.errorType).toBe("string");
      expect(typeof json.error.errorMessage).toBe("string");
    });
  });

  describe("Error responses (500)", () => {
    it("should return 500 for unexpected exceptions", async () => {
      vi.mocked(projectConfigService.cancelDiscovery).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const res = await app.request("/api/project/discovery/cancel", {
        method: "POST",
      });

      const json = (await res.json()) as {
        error: {
          errorType: string;
          errorMessage: string;
        };
      };

      expect(res.status).toBe(500);
      expect(json.error).toBeDefined();
      expect(json.error.errorType).toBe("unknown");
      expect(json.error.errorMessage).toContain("Database connection failed");
    });
  });

  describe("Idempotency", () => {
    it("should handle multiple cancellation requests gracefully", async () => {
      vi.mocked(projectConfigService.cancelDiscovery).mockResolvedValue({
        cancelled: false,
        message: "No discovery in progress",
      });

      const res1 = await app.request("/api/project/discovery/cancel", {
        method: "POST",
      });
      const res2 = await app.request("/api/project/discovery/cancel", {
        method: "POST",
      });

      expect(res1.status).toBe(404);
      expect(res2.status).toBe(404);

      expect(projectConfigService.cancelDiscovery).toHaveBeenCalledTimes(2);
    });
  });
});

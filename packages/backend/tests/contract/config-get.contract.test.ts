import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ConfigurationResponse } from "@promptalicious/shared-infra";

import app from "@/app";
import * as configService from "@/services/config.service";

vi.mock("@/services/config.service", () => ({
  getConfig: vi.fn(),
}));

describe("GET /config - Contract Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(configService.getConfig).mockResolvedValue({
      id: 1,
      selectedModel: "gpt-4o-mini",
      baseURL: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    });
  });

  it("should return 200 status", async () => {
    const response = await app.request("/api/config");
    expect(response.status).toBe(200);
  });

  it("should return response matching ConfigurationResponse schema", async () => {
    const response = await app.request("/api/config");
    const data = (await response.json()) as ConfigurationResponse;

    expect(data).toHaveProperty("config");
    expect(data).toHaveProperty("availableModels");

    expect(data.config).toHaveProperty("id");
    expect(data.config).toHaveProperty("selectedModel");
    expect(data.config).toHaveProperty("createdAt");
    expect(data.config).toHaveProperty("updatedAt");

    expect(data.config.id).toBe(1);
    expect(typeof data.config.selectedModel).toBe("string");
    expect(typeof data.config.createdAt).toBe("string");
    expect(typeof data.config.updatedAt).toBe("string");

    if (data.config.baseURL !== undefined) {
      expect(
        typeof data.config.baseURL === "string" || data.config.baseURL === null,
      ).toBe(true);
    }

    expect(Array.isArray(data.availableModels)).toBe(true);
  });

  it("should NOT include apiKey in response (security check)", async () => {
    const response = await app.request("/api/config");
    const data = (await response.json()) as ConfigurationResponse;

    expect(data.config).not.toHaveProperty("apiKey");
  });

  it("should include gpt-4o-mini in availableModels array", async () => {
    const response = await app.request("/api/config");
    const data = (await response.json()) as ConfigurationResponse;

    expect(data.availableModels).toContain("gpt-4o-mini");
  });

  it("should call getConfig service method", async () => {
    await app.request("/api/config");

    expect(configService.getConfig).toHaveBeenCalledOnce();
  });

  it("should handle null baseURL correctly", async () => {
    vi.mocked(configService.getConfig).mockResolvedValue({
      id: 1,
      selectedModel: "gpt-4o-mini",
      baseURL: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    });

    const response = await app.request("/api/config");
    const data = (await response.json()) as ConfigurationResponse;

    expect(data.config.baseURL).toBeUndefined();
  });

  it("should handle custom baseURL correctly", async () => {
    vi.mocked(configService.getConfig).mockResolvedValue({
      id: 1,
      selectedModel: "gpt-4o-mini",
      baseURL: "https://api.openai.com/v1",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    });

    const response = await app.request("/api/config");
    const data = (await response.json()) as ConfigurationResponse;

    expect(data.config.baseURL).toBe("https://api.openai.com/v1");
  });
});

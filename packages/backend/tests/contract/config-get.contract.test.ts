import { describe, it, expect } from "vitest";
import type { ConfigurationResponse } from "@promptalicious/shared-infra";

import app from "../../src/app";

describe("GET /config - Contract Test", () => {
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

    if (data.config.providerEndpoint !== undefined) {
      expect(typeof data.config.providerEndpoint).toBe("string");
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
});

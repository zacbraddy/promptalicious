import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TestConnectionResponse } from "@promptalicious/shared-infra";

import app from "@/app";
import * as configService from "@/services/configService";

vi.mock("@/services/configService", () => ({
  getConfig: vi.fn(),
  updateConfig: vi.fn(),
  testConnection: vi.fn(),
  getApiKey: vi.fn(),
}));

describe("POST /config/test-connection - Contract Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(configService.getConfig).mockResolvedValue({
      id: 1,
      selectedModel: "gpt-4o-mini",
      baseURL: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    });

    vi.mocked(configService.getApiKey).mockResolvedValue(
      "sk-proj-test-key-12345",
    );

    vi.mocked(configService.testConnection).mockResolvedValue({
      success: true,
      message: "Successfully connected to OpenAI API with gpt-4o-mini",
    });
  });

  it("should return 200 with success response when connection test succeeds", async () => {
    const response = await app.request("/api/config/test-connection", {
      method: "POST",
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as TestConnectionResponse;

    expect(body).toHaveProperty("success");
    expect(body).toHaveProperty("message");
    expect(typeof body.success).toBe("boolean");
    expect(typeof body.message).toBe("string");

    if (body.success) {
      expect(body.success).toBe(true);
      expect(body.message).toBeTruthy();
      expect(body.error).toBeUndefined();
    }
  });

  it("should return 400 with error details when connection test fails", async () => {
    vi.mocked(configService.testConnection).mockResolvedValue({
      success: false,
      message: "Connection failed: Invalid API key",
      error: {
        errorType: "authentication",
        errorCode: "invalid_api_key",
      },
    });

    const response = await app.request("/api/config/test-connection", {
      method: "POST",
    });

    expect(response.status).toBe(400);

    const body = (await response.json()) as TestConnectionResponse;

    expect(body).toHaveProperty("success");
    expect(body).toHaveProperty("message");
    expect(body.success).toBe(false);
    expect(typeof body.message).toBe("string");
    expect(body.message).toBeTruthy();

    expect(body.error).toBeDefined();
    expect(body.error).toHaveProperty("errorType");
    expect(typeof body.error?.errorType).toBe("string");

    if (body.error?.errorCode) {
      expect(typeof body.error.errorCode).toBe("string");
    }
  });

  it("should match TestConnectionResponse schema structure", async () => {
    const response = await app.request("/api/config/test-connection", {
      method: "POST",
    });

    expect([200, 400]).toContain(response.status);

    const body = (await response.json()) as TestConnectionResponse;

    expect(body).toHaveProperty("success");
    expect(typeof body.success).toBe("boolean");

    expect(body).toHaveProperty("message");
    expect(typeof body.message).toBe("string");

    if (!body.success && body.error) {
      expect(typeof body.error).toBe("object");
      expect(body.error).toHaveProperty("errorType");
      expect(typeof body.error.errorType).toBe("string");
    }
  });

  it("should return valid JSON content-type header", async () => {
    const response = await app.request("/api/config/test-connection", {
      method: "POST",
    });

    const contentType = response.headers.get("content-type");
    expect(contentType).toContain("application/json");
  });
});

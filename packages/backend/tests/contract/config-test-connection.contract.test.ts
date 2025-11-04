import { describe, it, expect } from "vitest";
import type { TestConnectionResponse } from "@promptalicious/shared-infra";

import app from "../../src/app";

describe("POST /config/test-connection - Contract Tests", () => {
  it("should return 200 with success response when connection test succeeds", async () => {
    const response = await app.request("/config/test-connection", {
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
    const response = await app.request("/config/test-connection", {
      method: "POST",
    });

    if (response.status === 400) {
      const body = (await response.json()) as TestConnectionResponse;

      expect(body).toHaveProperty("success");
      expect(body).toHaveProperty("message");
      expect(body.success).toBe(false);
      expect(typeof body.message).toBe("string");
      expect(body.message).toBeTruthy();

      if (body.error) {
        expect(body.error).toHaveProperty("errorType");
        expect(typeof body.error.errorType).toBe("string");

        if (body.error.errorCode) {
          expect(typeof body.error.errorCode).toBe("string");
        }
      }
    }
  });

  it("should match TestConnectionResponse schema structure", async () => {
    const response = await app.request("/config/test-connection", {
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
    const response = await app.request("/config/test-connection", {
      method: "POST",
    });

    const contentType = response.headers.get("content-type");
    expect(contentType).toContain("application/json");
  });
});

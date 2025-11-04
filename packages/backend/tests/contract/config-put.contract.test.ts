import { describe, it, expect } from "vitest";
import type {
  UpdateConfigurationRequest,
  UpdateConfigurationSuccessResponse,
  UpdateConfigurationErrorResponse,
} from "@promptalicious/shared-infra";

import app from "../../src/app";

describe("PUT /config endpoint contract", () => {
  describe("Success responses (200)", () => {
    it("should return 200 with validation success when updating with valid API key", async () => {
      const res = await app.request("/api/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: "sk-proj-valid-key-12345",
        } satisfies UpdateConfigurationRequest),
      });

      const json = (await res.json()) as UpdateConfigurationSuccessResponse;

      expect(res.status).toBe(200);
      expect(json).toHaveProperty("config");
      expect(json).toHaveProperty("validationResult");
      expect(json.config).toHaveProperty("id", 1);
      expect(json.config).toHaveProperty("selectedModel", "gpt-4o-mini");
      expect(json.config).toHaveProperty("updatedAt");
      expect(json.config).not.toHaveProperty("apiKey");
      expect(json.validationResult).toEqual({
        success: true,
        message: "API credentials validated successfully",
      });
    });

    it("should return 200 when updating model selection", async () => {
      const res = await app.request("/api/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedModel: "gpt-4o-mini",
        } satisfies UpdateConfigurationRequest),
      });

      const json = (await res.json()) as UpdateConfigurationSuccessResponse;

      expect(res.status).toBe(200);
      expect(json.config.selectedModel).toBe("gpt-4o-mini");
      expect(json.validationResult.success).toBe(true);
    });

    it("should return 200 when updating provider endpoint", async () => {
      const res = await app.request("/api/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerEndpoint: "https://api.openai.com/v1",
        } satisfies UpdateConfigurationRequest),
      });

      const json = (await res.json()) as UpdateConfigurationSuccessResponse;

      expect(res.status).toBe(200);
      expect(json.config.providerEndpoint).toBe("https://api.openai.com/v1");
      expect(json.validationResult.success).toBe(true);
    });

    it("should return 200 when updating multiple fields", async () => {
      const res = await app.request("/api/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedModel: "gpt-4o-mini",
          apiKey: "sk-proj-newkey123456789",
          providerEndpoint: "https://api.openai.com/v1",
        } satisfies UpdateConfigurationRequest),
      });

      const json = (await res.json()) as UpdateConfigurationSuccessResponse;

      expect(res.status).toBe(200);
      expect(json.config.selectedModel).toBe("gpt-4o-mini");
      expect(json.config.providerEndpoint).toBe("https://api.openai.com/v1");
      expect(json.validationResult.success).toBe(true);
    });
  });

  describe("Validation error responses (400)", () => {
    it("should return 400 with validation error when API key is invalid", async () => {
      const res = await app.request("/api/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: "sk-invalid-key",
        } satisfies UpdateConfigurationRequest),
      });

      const json = (await res.json()) as UpdateConfigurationErrorResponse;

      expect(res.status).toBe(400);
      expect(json).toHaveProperty("error");
      expect(json.error.errorType).toBe("authentication");
      expect(json.error.errorMessage).toContain("API key validation failed");
      expect(json.error.additionalContext).toBeDefined();
      expect(json.error.additionalContext?.testCallFailed).toBe(true);
    });

    it("should return 400 with validation error when request body is empty", async () => {
      const res = await app.request("/api/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const json = (await res.json()) as UpdateConfigurationErrorResponse;

      expect(res.status).toBe(400);
      expect(json.error.errorType).toBe("validation");
      expect(json.error.errorMessage).toContain("at least one field");
    });

    it("should return 400 with validation error when API key is empty string", async () => {
      const res = await app.request("/api/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: "",
        } satisfies UpdateConfigurationRequest),
      });

      const json = (await res.json()) as UpdateConfigurationErrorResponse;

      expect(res.status).toBe(400);
      expect(json.error.errorType).toBe("validation");
      expect(json.error.errorMessage).toContain("cannot be empty");
    });

    it("should return 400 with validation error when selected model is invalid", async () => {
      const res = await app.request("/api/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedModel: "gpt-5-invalid",
        } satisfies UpdateConfigurationRequest),
      });

      const json = (await res.json()) as UpdateConfigurationErrorResponse;

      expect(res.status).toBe(400);
      expect(json.error.errorType).toBe("validation");
      expect(json.error.errorMessage).toContain("Invalid model");
      expect(json.error.additionalContext).toBeDefined();
    });

    it("should return 400 with validation error when provider endpoint is invalid URL", async () => {
      const res = await app.request("/api/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerEndpoint: "not-a-valid-url",
        } satisfies UpdateConfigurationRequest),
      });

      const json = (await res.json()) as UpdateConfigurationErrorResponse;

      expect(res.status).toBe(400);
      expect(json.error.errorType).toBe("validation");
      expect(json.error.errorMessage).toContain("valid URL");
    });
  });

  describe("Response schema validation", () => {
    it("should ensure success response matches schema with all required fields", async () => {
      const res = await app.request("/api/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: "sk-test",
        }),
      });

      const json = (await res.json()) as UpdateConfigurationSuccessResponse;

      expect(json.config).toBeDefined();
      expect(typeof json.config.id).toBe("number");
      expect(typeof json.config.selectedModel).toBe("string");
      expect(typeof json.config.createdAt).toBe("string");
      expect(typeof json.config.updatedAt).toBe("string");

      expect(json.validationResult).toBeDefined();
      expect(json.validationResult.success).toBe(true);
      expect(typeof json.validationResult.message).toBe("string");

      expect(json.config).not.toHaveProperty("apiKey");
    });

    it("should ensure error response matches schema with required fields", async () => {
      const res = await app.request("/api/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: "invalid",
        }),
      });

      const json = (await res.json()) as UpdateConfigurationErrorResponse;

      expect(json.error).toBeDefined();
      expect(typeof json.error.errorType).toBe("string");
      expect(["authentication", "validation"]).toContain(json.error.errorType);
      expect(typeof json.error.errorMessage).toBe("string");
    });

    it("should ensure apiKey is never included in success response", async () => {
      const res = await app.request("/api/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: "sk-proj-secret-key-12345",
        }),
      });

      const json = (await res.json()) as UpdateConfigurationSuccessResponse;

      expect(res.status).toBe(200);
      expect(json.config).not.toHaveProperty("apiKey");

      const responseText = JSON.stringify(json);
      expect(responseText).not.toContain("sk-proj");
      expect(responseText).not.toContain("secret");
    });
  });

  describe("Automatic validation behaviour", () => {
    it("should indicate that API key was automatically validated on save", async () => {
      const res = await app.request("/api/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: "sk-proj-valid-key",
        }),
      });

      const json = (await res.json()) as UpdateConfigurationSuccessResponse;

      expect(res.status).toBe(200);
      expect(json.validationResult.success).toBe(true);
      expect(json.validationResult.message).toContain("validated");
    });

    it("should not save configuration when validation fails", async () => {
      const res = await app.request("/api/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: "sk-invalid",
        }),
      });

      const json = (await res.json()) as UpdateConfigurationErrorResponse;

      expect(res.status).toBe(400);
      expect(json.error.errorType).toBe("authentication");
      expect(json.error.additionalContext?.testCallFailed).toBe(true);
    });
  });
});

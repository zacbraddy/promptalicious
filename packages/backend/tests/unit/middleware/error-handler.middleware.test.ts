import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import {
  errorHandler,
  AppError,
  type ErrorResponse,
} from "@/middleware/error-handler.middleware";

describe("errorHandler middleware", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.onError(errorHandler);
  });

  describe("AppError handling", () => {
    it("should handle AppError with all fields", async () => {
      app.get("/test", () => {
        throw new AppError(
          401,
          "authentication",
          "Invalid API key",
          "invalid_api_key",
          { testField: "testValue" },
        );
      });

      const res = await app.request("/test");
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({
        error: {
          errorType: "authentication",
          errorMessage: "Invalid API key",
          errorCode: "invalid_api_key",
          additionalContext: { testField: "testValue" },
        },
      });
    });

    it("should handle AppError without optional fields", async () => {
      app.get("/test", () => {
        throw new AppError(400, "validation", "Prompt text cannot be empty");
      });

      const res = await app.request("/test");
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({
        error: {
          errorType: "validation",
          errorMessage: "Prompt text cannot be empty",
        },
      });
    });

    it("should handle rate limit error", async () => {
      app.get("/test", () => {
        throw new AppError(
          429,
          "rate_limit",
          "Rate limit exceeded. Please try again in 60 seconds.",
          "rate_limit_exceeded",
          { retryAfter: 60 },
        );
      });

      const res = await app.request("/test");
      const json = await res.json();

      expect(res.status).toBe(429);
      expect(json).toEqual({
        error: {
          errorType: "rate_limit",
          errorMessage: "Rate limit exceeded. Please try again in 60 seconds.",
          errorCode: "rate_limit_exceeded",
          additionalContext: { retryAfter: 60 },
        },
      });
    });

    it("should handle timeout error", async () => {
      app.get("/test", () => {
        throw new AppError(
          504,
          "timeout",
          "The LLM request timed out after 60 seconds.",
        );
      });

      const res = await app.request("/test");
      const json = await res.json();

      expect(res.status).toBe(504);
      expect(json).toEqual({
        error: {
          errorType: "timeout",
          errorMessage: "The LLM request timed out after 60 seconds.",
        },
      });
    });
  });

  describe("HTTPException handling", () => {
    it("should handle HTTPException with 401 status", async () => {
      app.get("/test", () => {
        throw new HTTPException(401, { message: "Unauthorized access" });
      });

      const res = await app.request("/test");
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({
        error: {
          errorType: "authentication",
          errorMessage: "Unauthorized access",
        },
      });
    });

    it("should handle HTTPException with 400 status", async () => {
      app.get("/test", () => {
        throw new HTTPException(400, { message: "Bad request" });
      });

      const res = await app.request("/test");
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({
        error: {
          errorType: "validation",
          errorMessage: "Bad request",
        },
      });
    });

    it("should handle HTTPException with 429 status", async () => {
      app.get("/test", () => {
        throw new HTTPException(429, { message: "Too many requests" });
      });

      const res = await app.request("/test");
      const json = await res.json();

      expect(res.status).toBe(429);
      expect(json).toEqual({
        error: {
          errorType: "rate_limit",
          errorMessage: "Too many requests",
        },
      });
    });
  });

  describe("ValidationError handling", () => {
    it("should handle ValidationError", async () => {
      app.get("/test", () => {
        const err = new Error("Field 'email' is required");
        err.name = "ValidationError";
        throw err;
      });

      const res = await app.request("/test");
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({
        error: {
          errorType: "validation",
          errorMessage: "Field 'email' is required",
        },
      });
    });
  });

  describe("Network error handling", () => {
    it("should handle ECONNREFUSED error", async () => {
      app.get("/test", () => {
        const err = new Error("connect ECONNREFUSED 127.0.0.1:5432");
        throw err;
      });

      const res = await app.request("/test");
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({
        error: {
          errorType: "network",
          errorMessage: "Unable to connect to external service",
        },
      });
    });
  });

  describe("Timeout error handling", () => {
    it("should handle timeout error from message", async () => {
      app.get("/test", () => {
        throw new Error("Request timeout after 30 seconds");
      });

      const res = await app.request("/test");
      const json = await res.json();

      expect(res.status).toBe(504);
      expect(json).toEqual({
        error: {
          errorType: "timeout",
          errorMessage: "Request timed out",
        },
      });
    });

    it("should handle ETIMEDOUT error", async () => {
      app.get("/test", () => {
        throw new Error("ETIMEDOUT: connection timeout");
      });

      const res = await app.request("/test");
      const json = await res.json();

      expect(res.status).toBe(504);
      expect(json).toEqual({
        error: {
          errorType: "timeout",
          errorMessage: "Request timed out",
        },
      });
    });
  });

  describe("Unknown error handling", () => {
    it("should handle generic Error with unknown type", async () => {
      app.get("/test", () => {
        throw new Error("Something unexpected happened");
      });

      const res = await app.request("/test");
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({
        error: {
          errorType: "unknown",
          errorMessage: "Internal server error",
        },
      });
    });

    it("should handle errors without message", async () => {
      app.get("/test", () => {
        throw new Error();
      });

      const res = await app.request("/test");
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({
        error: {
          errorType: "unknown",
          errorMessage: "Internal server error",
        },
      });
    });
  });

  describe("Error response format consistency", () => {
    it("should always return error object with required fields", async () => {
      app.get("/test", () => {
        throw new AppError(400, "validation", "Test error");
      });

      const res = await app.request("/test");
      const json = (await res.json()) as ErrorResponse;

      expect(json).toHaveProperty("error");
      expect(json.error).toHaveProperty("errorType");
      expect(json.error).toHaveProperty("errorMessage");
      expect(typeof json.error.errorType).toBe("string");
      expect(typeof json.error.errorMessage).toBe("string");
    });

    it("should not include undefined optional fields", async () => {
      app.get("/test", () => {
        throw new AppError(400, "validation", "Test error");
      });

      const res = await app.request("/test");
      const json = (await res.json()) as ErrorResponse;

      expect(json.error).not.toHaveProperty("errorCode");
      expect(json.error).not.toHaveProperty("additionalContext");
    });

    it("should include optional fields when provided", async () => {
      app.get("/test", () => {
        throw new AppError(
          401,
          "authentication",
          "Invalid key",
          "invalid_api_key",
          {
            field: "apiKey",
          },
        );
      });

      const res = await app.request("/test");
      const json = (await res.json()) as ErrorResponse;

      expect(json.error).toHaveProperty("errorCode", "invalid_api_key");
      expect(json.error).toHaveProperty("additionalContext");
      expect(json.error.additionalContext).toEqual({ field: "apiKey" });
    });
  });
});

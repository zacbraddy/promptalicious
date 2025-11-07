import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
  afterEach,
} from "vitest";
import { eq } from "drizzle-orm";
import type { ExecutePromptErrorResponse } from "@promptalicious/shared-infra";

import app from "@/app";
import { db } from "@/db/connection";
import { llmConfig, pricingInfo, exchangeRates } from "@/db/schema";
import * as llmService from "@/services/llmService";

describe("Error scenarios in prompt execution (integration)", () => {
  let savedConfig: typeof llmConfig.$inferSelect | null = null;

  beforeAll(async () => {
    const config = await db
      .select()
      .from(llmConfig)
      .where(eq(llmConfig.id, 1))
      .limit(1);

    if (config.length && config[0]) {
      savedConfig = config[0];
    }
  });

  beforeEach(async () => {
    await db
      .insert(pricingInfo)
      .values({
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000015",
        outputTokenPriceUsd: "0.0000006",
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: [pricingInfo.model, pricingInfo.provider],
        set: {
          inputTokenPriceUsd: "0.00000015",
          outputTokenPriceUsd: "0.0000006",
          lastUpdated: new Date(),
        },
      });

    await db
      .insert(exchangeRates)
      .values({
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: "0.79",
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: [exchangeRates.fromCurrency, exchangeRates.toCurrency],
        set: {
          rate: "0.79",
          lastUpdated: new Date(),
        },
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    if (savedConfig) {
      try {
        await db.delete(llmConfig).where(eq(llmConfig.id, 1));
        await db.insert(llmConfig).values(savedConfig);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it("should return 400 validation error for empty prompt", async () => {
    const response = await app.request("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: "",
      }),
    });

    expect(response.status).toBe(400);

    const data = (await response.json()) as ExecutePromptErrorResponse;

    expect(data.execution).toBeDefined();
    expect(data.execution.status).toBe("failed");
    expect(data.execution.promptText).toBe("");

    expect(data.error).toBeDefined();
    expect(data.error.errorType).toBe("validation");
    expect(data.error.errorMessage).toBe("Prompt text cannot be empty");
  });

  it("should return 400 validation error for whitespace-only prompt", async () => {
    const response = await app.request("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: "   \n\t  ",
      }),
    });

    expect(response.status).toBe(400);

    const data = (await response.json()) as ExecutePromptErrorResponse;

    expect(data.error.errorType).toBe("validation");
    expect(data.error.errorMessage).toBe("Prompt text cannot be empty");
  });

  it("should return 401 authentication error for invalid API key", async () => {
    await db
      .insert(llmConfig)
      .values({
        id: 1,
        selectedModel: "gpt-4o-mini",
        apiKey: "sk-invalid-key-12345",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: llmConfig.id,
        set: {
          apiKey: "sk-invalid-key-12345",
          updatedAt: new Date(),
        },
      });

    const response = await app.request("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: "Test authentication error",
      }),
    });

    expect(response.status).toBe(401);

    const data = (await response.json()) as ExecutePromptErrorResponse;

    expect(data.execution).toBeDefined();
    expect(data.execution.status).toBe("failed");
    expect(data.execution.promptText).toBe("Test authentication error");

    expect(data.error).toBeDefined();
    expect(data.error.errorType).toBe("authentication");
    expect(data.error.errorMessage).toContain("API key");
  });

  it("should return 500 network error when connection fails", async () => {
    await db
      .insert(llmConfig)
      .values({
        id: 1,
        selectedModel: "gpt-4o-mini",
        apiKey: process.env.OPENAI_API_KEY || "sk-test-key",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: llmConfig.id,
        set: {
          apiKey: process.env.OPENAI_API_KEY || "sk-test-key",
          updatedAt: new Date(),
        },
      });

    vi.spyOn(llmService, "executePrompt").mockImplementation(() => {
      throw new Error("Network error: ENOTFOUND api.openai.com");
    });

    const response = await app.request("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: "Test network error",
      }),
    });

    expect(response.status).toBe(500);

    const data = (await response.json()) as ExecutePromptErrorResponse;

    expect(data.execution).toBeDefined();
    expect(data.execution.status).toBe("failed");
    expect(data.execution.promptText).toBe("Test network error");

    expect(data.error).toBeDefined();
    expect(data.error.errorType).toBe("network");
    expect(data.error.errorMessage).toContain("Unable to connect");
  });

  it("should return 500 network error for connection refused", async () => {
    await db
      .insert(llmConfig)
      .values({
        id: 1,
        selectedModel: "gpt-4o-mini",
        apiKey: process.env.OPENAI_API_KEY || "sk-test-key",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: llmConfig.id,
        set: {
          apiKey: process.env.OPENAI_API_KEY || "sk-test-key",
          updatedAt: new Date(),
        },
      });

    vi.spyOn(llmService, "executePrompt").mockImplementation(() => {
      throw new Error("fetch failed: connection refused (ECONNREFUSED)");
    });

    const response = await app.request("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: "Test connection refused",
      }),
    });

    expect(response.status).toBe(500);

    const data = (await response.json()) as ExecutePromptErrorResponse;

    expect(data.error.errorType).toBe("network");
    expect(data.error.errorMessage).toContain("Unable to connect");
  });

  it("should include execution details in all error responses", async () => {
    const response = await app.request("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: "",
      }),
    });

    const data = (await response.json()) as ExecutePromptErrorResponse;

    expect(data.execution.id).toBeDefined();
    expect(data.execution.executionTimestamp).toBeDefined();
    expect(data.execution.targetModel).toBe("gpt-4o-mini");

    expect(data.error.id).toBeDefined();
    expect(data.error.promptExecutionId).toBe(data.execution.id);
    expect(data.error.timestamp).toBeDefined();
  });
});

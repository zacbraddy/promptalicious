import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import type { ExecutePromptSuccessResponse } from "@promptalicious/shared-infra";

import app from "@/app";
import { db } from "@/db/connection";
import { llmConfig, pricingInfo, exchangeRates } from "@/db/schema";

describe("Successful prompt execution with full diagnostics (integration)", () => {
  let savedConfig: typeof llmConfig.$inferSelect | null = null;

  beforeAll(async () => {
    const config = await db
      .select()
      .from(llmConfig)
      .where(eq(llmConfig.id, 1))
      .limit(1);

    if (!config.length || !config[0]?.apiKey) {
      throw new Error(`
❌ Integration tests require LLM configuration in database

Please configure your LLM settings before running integration tests:

1. Start the application:
   pnpm dev

2. Open the frontend in your browser (typically http://localhost:5173)

3. Navigate to the Settings page and configure:
   - API Key (required)
   - Model selection
   - Provider endpoint (if needed)

4. Re-run the integration tests

The integration tests make real LLM API calls and require valid configuration.
`);
    }

    savedConfig = config[0];
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

  it("should execute prompt and return full diagnostics", async () => {
    const testPrompt = "Say 'Hello, world!' and nothing else.";

    const response = await app.request("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: testPrompt,
      }),
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as ExecutePromptSuccessResponse;

    expect(data.execution).toBeDefined();
    expect(data.execution.id).toBeDefined();
    expect(data.execution.promptText).toBe(testPrompt);
    expect(data.execution.status).toBe("completed");
    expect(data.execution.executionTimestamp).toBeDefined();

    expect(data.result).toBeDefined();
    expect(data.result.responseText).toBeDefined();
    expect(data.result.responseText.length).toBeGreaterThan(0);

    expect(data.result.inputTokenCount).toBeGreaterThan(0);
    expect(data.result.outputTokenCount).toBeGreaterThan(0);
    expect(data.result.totalTokenCount).toBe(
      data.result.inputTokenCount + data.result.outputTokenCount,
    );

    expect(data.result.executionDurationMs).toBeGreaterThan(0);

    expect(data.result.estimatedCostGBP).toBeGreaterThanOrEqual(0);
    expect(typeof data.result.estimatedCostGBP).toBe("number");
  });

  it(
    "should handle longer prompts with accurate token counting",
    { timeout: 15000 },
    async () => {
      const longPrompt = `
You are a helpful assistant. Please provide a detailed explanation of the following concept:

What is test-driven development (TDD)? Include:
1. A definition
2. The main phases (Red-Green-Refactor)
3. Benefits of using TDD
4. Common pitfalls

Keep your response under 200 words.
    `.trim();

      const response = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptText: longPrompt,
        }),
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as ExecutePromptSuccessResponse;

      expect(data.result.inputTokenCount).toBeGreaterThan(50);
      expect(data.result.outputTokenCount).toBeGreaterThan(50);

      expect(data.result.responseText.length).toBeGreaterThan(100);

      expect(data.result.estimatedCostGBP).toBeGreaterThanOrEqual(0);
    },
  );
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import type { ExecutePromptSuccessResponse } from "@promptalicious/shared-infra";

import app from "@/app";
import { db } from "@/db/connection";
import { llmConfig, pricingInfo, exchangeRates } from "@/db/schema";

describe("Special characters in prompts (integration)", () => {
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

  it("should handle special characters in prompt without corruption", async () => {
    const promptWithSpecialChars =
      "Explain these programming symbols: \\n, \\t, &&, ||, >=, <=, !=, ===. Keep your answer under 50 words.";

    const response = await app.request("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: promptWithSpecialChars,
      }),
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as ExecutePromptSuccessResponse;

    expect(data.execution).toBeDefined();
    expect(data.execution.status).toBe("completed");
    expect(data.execution.promptText).toBe(promptWithSpecialChars);

    expect(data.result).toBeDefined();
    expect(data.result.responseText).toBeDefined();
    expect(data.result.responseText.length).toBeGreaterThan(0);

    expect(data.result.inputTokenCount).toBeGreaterThan(0);
    expect(data.result.outputTokenCount).toBeGreaterThan(0);
    expect(data.result.totalTokenCount).toBe(
      data.result.inputTokenCount + data.result.outputTokenCount,
    );
  });

  it("should handle unicode characters in prompt", async () => {
    const promptWithUnicode =
      "What are these symbols: €, £, ¥, ©, ®, ™? Answer in one sentence.";

    const response = await app.request("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: promptWithUnicode,
      }),
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as ExecutePromptSuccessResponse;

    expect(data.execution.promptText).toBe(promptWithUnicode);
    expect(data.execution.status).toBe("completed");

    expect(data.result.responseText).toBeDefined();
    expect(data.result.responseText.length).toBeGreaterThan(0);
  });

  it("should handle emoji characters in prompt", async () => {
    const promptWithEmoji =
      "What is the meaning of this emoji: 🤖? Answer in one sentence.";

    const response = await app.request("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: promptWithEmoji,
      }),
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as ExecutePromptSuccessResponse;

    expect(data.execution.promptText).toBe(promptWithEmoji);
    expect(data.execution.status).toBe("completed");

    expect(data.result.responseText).toBeDefined();
    expect(data.result.responseText.length).toBeGreaterThan(0);
  });

  it("should handle quotes and apostrophes in prompt", async () => {
    const promptWithQuotes =
      "Explain the difference between \"double quotes\" and 'single quotes' in one sentence.";

    const response = await app.request("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: promptWithQuotes,
      }),
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as ExecutePromptSuccessResponse;

    expect(data.execution.promptText).toBe(promptWithQuotes);
    expect(data.execution.status).toBe("completed");

    expect(data.result.responseText).toBeDefined();
    expect(data.result.responseText.length).toBeGreaterThan(0);
  });

  it("should handle newlines and tabs in prompt", async () => {
    const promptWithWhitespace =
      "List three\nprogramming\tlanguages.\nOne per line.";

    const response = await app.request("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: promptWithWhitespace,
      }),
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as ExecutePromptSuccessResponse;

    expect(data.execution.promptText).toBe(promptWithWhitespace);
    expect(data.execution.status).toBe("completed");

    expect(data.result.responseText).toBeDefined();
    expect(data.result.responseText.length).toBeGreaterThan(0);
  });

  it("should handle mixed special characters without corruption", async () => {
    const promptWithMixedChars =
      'Test: <tag>, {bracket}, [array], @mention, #hash, $var, %, ^, &, *, (), _, +, =, |, \\, /, ?. Answer "ok".';

    const response = await app.request("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        promptText: promptWithMixedChars,
      }),
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as ExecutePromptSuccessResponse;

    expect(data.execution.promptText).toBe(promptWithMixedChars);
    expect(data.execution.status).toBe("completed");

    expect(data.result.responseText).toBeDefined();
    expect(data.result.responseText.length).toBeGreaterThan(0);
  });
});

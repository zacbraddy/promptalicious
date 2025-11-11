import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import type {
  ExecutePromptSuccessResponse,
  ExecutePromptErrorResponse,
  ExecutionStatusResponse,
} from "@promptalicious/shared-infra";

import app from "@/app";
import { db } from "@/db/connection";
import { llmConfig, pricingInfo, exchangeRates } from "@/db/schema";
import { executionStateCacheService } from "@/services/execution-state-cache.service";

describe("Backend execution lifecycle (integration)", () => {
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
    executionStateCacheService.clearCache();

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
    executionStateCacheService.clearCache();

    if (savedConfig) {
      try {
        await db.delete(llmConfig).where(eq(llmConfig.id, 1));
        await db.insert(llmConfig).values(savedConfig);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it(
    "should handle full execution lifecycle with state management",
    { timeout: 20000 },
    async () => {
      const testPrompt = "Say 'Hello' and nothing else.";

      const statusBefore = await app.request("/api/execute/status");
      expect(statusBefore.status).toBe(200);
      const statusBeforeData =
        (await statusBefore.json()) as ExecutionStatusResponse;
      expect(statusBeforeData.isExecuting).toBe(false);
      expect(statusBeforeData.execution).toBeNull();

      const executeResponse = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptText: testPrompt,
        }),
      });

      expect(executeResponse.status).toBe(200);
      const executeData =
        (await executeResponse.json()) as ExecutePromptSuccessResponse;
      expect(executeData.execution.status).toBe("completed");
      expect(executeData.result).toBeDefined();
      expect(executeData.result.responseText).toBeDefined();

      const statusAfterComplete = await app.request("/api/execute/status");
      expect(statusAfterComplete.status).toBe(200);
      const statusAfterCompleteData =
        (await statusAfterComplete.json()) as ExecutionStatusResponse;
      expect(statusAfterCompleteData.isExecuting).toBe(false);
      expect(statusAfterCompleteData.execution).toBeDefined();
      expect(statusAfterCompleteData.result).toBeDefined();
      expect(statusAfterCompleteData.result?.responseText).toBe(
        executeData.result.responseText,
      );

      const statusAfterClear = await app.request("/api/execute/status");
      expect(statusAfterClear.status).toBe(200);
      const statusAfterClearData =
        (await statusAfterClear.json()) as ExecutionStatusResponse;
      expect(statusAfterClearData.isExecuting).toBe(false);
      expect(statusAfterClearData.execution).toBeNull();

      const secondExecute = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptText: "Say 'Goodbye' and nothing else.",
        }),
      });

      expect(secondExecute.status).toBe(200);
      const secondExecuteData =
        (await secondExecute.json()) as ExecutePromptSuccessResponse;
      expect(secondExecuteData.execution.status).toBe("completed");
      expect(secondExecuteData.result.responseText).not.toBe(
        executeData.result.responseText,
      );
    },
  );

  it(
    "should prevent concurrent executions with 409 status",
    { timeout: 30000 },
    async () => {
      const longPrompt = `
You are a helpful assistant. Please write a detailed explanation of quantum computing.
Include:
1. Basic principles
2. Quantum bits (qubits)
3. Superposition and entanglement
4. Current applications
5. Future potential

Write at least 300 words.
`.trim();

      const firstExecute = app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptText: longPrompt,
        }),
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      const secondExecute = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptText: "Say 'Hello'",
        }),
      });

      expect(secondExecute.status).toBe(409);
      const secondData =
        (await secondExecute.json()) as ExecutePromptErrorResponse;
      expect(secondData.error.errorType).toBe("validation");
      expect(secondData.error.errorMessage).toContain("already in progress");

      await firstExecute;

      await app.request("/api/execute/status");

      const thirdExecute = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptText: "Say 'World'",
        }),
      });

      expect(thirdExecute.status).toBe(200);
    },
  );

  it(
    "should restore execution state via status polling after simulated refresh",
    { timeout: 15000 },
    async () => {
      const testPrompt = "Say 'Testing' and nothing else.";

      const executeResponse = app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptText: testPrompt,
        }),
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      const statusDuringExecution = await app.request("/api/execute/status");
      expect(statusDuringExecution.status).toBe(200);

      const executeData =
        (await executeResponse) as unknown as Promise<Response>;
      const finalData = (await (
        await executeData
      ).json()) as ExecutePromptSuccessResponse;
      expect(finalData.execution.status).toBe("completed");

      const statusAfter = await app.request("/api/execute/status");
      const statusAfterData =
        (await statusAfter.json()) as ExecutionStatusResponse;
      expect(statusAfterData.result).toBeDefined();
    },
  );
});

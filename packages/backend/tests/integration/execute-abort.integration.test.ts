import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import type {
  ExecutePromptSuccessResponse,
  ExecutePromptErrorResponse,
  ExecutionStatusResponse,
  AbortExecutionResponse,
} from "@promptalicious/shared-infra";

import app from "@/app";
import { db } from "@/db/connection";
import { llmConfig, pricingInfo, exchangeRates } from "@/db/schema";
import { executionStateCacheService } from "@/services/executionStateCacheService";

describe("POST /execute/abort - Integration Tests", () => {
  beforeAll(async () => {
    const config = await db
      .select()
      .from(llmConfig)
      .where(eq(llmConfig.id, 1))
      .limit(1);

    if (config.length === 0 || !config[0]?.apiKey) {
      throw new Error(`
Integration tests require valid LLM configuration.

Please configure the application:
1. Start the backend: pnpm --filter @promptalicious/backend dev
2. Navigate to http://localhost:3000 and configure your API key
3. Stop the backend
4. Re-run the integration tests

The integration tests make real LLM API calls and require valid configuration.
`);
    }
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

  it(
    "should abort an in-progress execution and store abort error in cache",
    { timeout: 20000 },
    async () => {
      const promptText =
        "Write a comprehensive 800-word technical article explaining how PostgreSQL handles concurrent transactions, covering MVCC, isolation levels, and deadlock prevention. Include detailed code examples and explanations.";

      // Step 1: Start an execution (POST /execute) - don't await, let it run in background
      const executePromise = app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptText,
        }),
      });

      // Allow brief moment for execution to register in cache
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Step 2: Abort the execution (POST /execute/abort)
      const abortResponse = await app.request("/api/execute/abort", {
        method: "POST",
      });

      expect(abortResponse.status).toBe(200);
      const abortData = (await abortResponse.json()) as AbortExecutionResponse;
      expect(abortData).toEqual({
        success: true,
        message: "Execution aborted successfully",
      });

      // Step 3: The original execute promise should now resolve with an abort error
      const executeResponse = await executePromise;
      expect(executeResponse.status).toBe(500);
      const executeData =
        (await executeResponse.json()) as ExecutePromptErrorResponse;
      expect(executeData.execution.status).toBe("failed");
      expect(executeData.error.errorType).toBe("aborted");

      // Step 4: Check status returns abort error (GET /execute/status)
      const statusResponse = await app.request("/api/execute/status");
      expect(statusResponse.status).toBe(200);
      const statusData =
        (await statusResponse.json()) as ExecutionStatusResponse;

      expect(statusData.isExecuting).toBe(false);
      expect(statusData.execution).toBeDefined();
      expect(statusData.execution?.status).toBe("failed");
      expect(statusData.error).toBeDefined();
      expect(statusData.error?.errorType).toBe("aborted");

      // Step 5: Verify status retrieval clears the cache (GET /execute/status again)
      const secondStatusResponse = await app.request("/api/execute/status");
      expect(secondStatusResponse.status).toBe(200);
      const secondStatusData =
        (await secondStatusResponse.json()) as ExecutionStatusResponse;

      expect(secondStatusData.isExecuting).toBe(false);
      expect(secondStatusData.execution).toBeNull();
    },
  );

  it("should return 400 error when attempting to abort with no execution in progress", async () => {
    // Step 5: Test abort with no execution returns 400 error
    const abortResponse = await app.request("/api/execute/abort", {
      method: "POST",
    });

    expect(abortResponse.status).toBe(400);
    const abortData = (await abortResponse.json()) as AbortExecutionResponse;
    expect(abortData).toEqual({
      success: false,
      message: "No execution in progress to abort",
      error: {
        errorType: "validation",
        errorMessage: "No execution is currently in progress",
      },
    });
  });

  it(
    "should handle abort after execution has already completed",
    { timeout: 20000 },
    async () => {
      const promptText = "Say hello";

      // Start execution
      const executeResponse = await app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ promptText }),
      });
      expect(executeResponse.status).toBe(200);

      // Wait for execution to complete (brief wait, as real LLM calls happen)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Try to abort after completion - should return 400
      const abortResponse = await app.request("/api/execute/abort", {
        method: "POST",
      });

      expect(abortResponse.status).toBe(400);
      const abortData = (await abortResponse.json()) as AbortExecutionResponse;
      expect(abortData.success).toBe(false);
      expect(abortData.message).toBe("No execution in progress to abort");
    },
  );

  it("should allow new execution after abort", { timeout: 20000 }, async () => {
    const firstPrompt =
      "Write a comprehensive 800-word technical article explaining how database indexing works, covering B-trees, hash indexes, and performance optimization strategies. Include detailed examples.";
    const secondPrompt = "Say hello";

    // Start first execution - don't await
    const firstExecutePromise = app.request("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ promptText: firstPrompt }),
    });

    // Allow execution to register in cache
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Abort first execution
    const abortResponse = await app.request("/api/execute/abort", {
      method: "POST",
    });
    expect(abortResponse.status).toBe(200);

    // Wait for first execute to complete with abort error
    await firstExecutePromise;

    // Consume abort status to clear cache
    const statusResponse = await app.request("/api/execute/status");
    expect(statusResponse.status).toBe(200);

    // Start new execution - should succeed
    const newExecuteResponse = await app.request("/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ promptText: secondPrompt }),
    });

    expect(newExecuteResponse.status).toBe(200);
    const newExecuteData =
      (await newExecuteResponse.json()) as ExecutePromptSuccessResponse;
    expect(newExecuteData.execution.promptText).toBe(secondPrompt);
    expect(newExecuteData.execution.status).toBe("completed");
  });

  it(
    "should clear abort controller reference after abort",
    { timeout: 20000 },
    async () => {
      const promptText =
        "Write a comprehensive 800-word technical article explaining how REST APIs work, covering HTTP methods, status codes, and best practices. Include detailed examples.";

      // Start execution - don't await
      const executePromise = app.request("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ promptText }),
      });

      // Allow execution to register in cache
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Abort execution
      const abortResponse = await app.request("/api/execute/abort", {
        method: "POST",
      });
      expect(abortResponse.status).toBe(200);

      // Check that abort controller is still in cache with abort signal
      const currentExecution = executionStateCacheService.getCurrentExecution();
      expect(currentExecution).not.toBeNull();
      expect(currentExecution?.abortController).toBeDefined();
      expect(currentExecution?.abortController.signal.aborted).toBe(true);

      // Wait for execute promise to complete
      await executePromise;

      // Consume status to clear cache
      const statusResponse = await app.request("/api/execute/status");
      expect(statusResponse.status).toBe(200);

      // Verify cache is cleared
      const clearedExecution = executionStateCacheService.getCurrentExecution();
      expect(clearedExecution).toBeNull();
    },
  );
});

import { randomUUID } from "crypto";

import { Hono } from "hono";
import type { Context } from "hono";
import type {
  ExecutePromptRequest,
  ExecutePromptSuccessResponse,
  ExecutePromptErrorResponse,
  ExecutionStatusResponse,
  PromptExecution,
  ExecutionResult,
  ExecutionError,
} from "@promptalicious/shared-infra";

import { getConfig, getApiKey } from "@/services/configService";
import { executePrompt, LLMExecutionError } from "@/services/llmService";
import { calculateCost } from "@/services/costCalculationService";
import { createExecutionError } from "@/services/errorClassificationService";
import { getPricingData } from "@/services/pricingService";
import { getExchangeRate } from "@/services/exchangeRateService";
import { executionStateCacheService } from "@/services/executionStateCacheService";
import { logger } from "@/lib/logger";

const router = new Hono();

router.get("/status", (c: Context) => {
  const currentExecution = executionStateCacheService.getCurrentExecution();

  if (!currentExecution) {
    const response: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
    };
    return c.json(response, 200);
  }

  const execution: PromptExecution = {
    id: currentExecution.executionId,
    promptText: currentExecution.promptText,
    executionTimestamp: currentExecution.startTimestamp.toISOString(),
    status: currentExecution.status,
    targetModel: currentExecution.targetModel,
  };

  if (currentExecution.status === "in_progress") {
    const response: ExecutionStatusResponse = {
      isExecuting: true,
      execution,
    };
    return c.json(response, 200);
  }

  const response: ExecutionStatusResponse = {
    isExecuting: false,
    execution,
    result: currentExecution.result,
    error: currentExecution.error,
  };

  executionStateCacheService.clearCache();

  logger.info(
    {
      executionId: currentExecution.executionId,
      status: currentExecution.status,
    },
    "Execution status retrieved and cache cleared",
  );

  return c.json(response, 200);
});

router.post("/", async (c: Context) => {
  const existingExecution = executionStateCacheService.getCurrentExecution();
  if (existingExecution && existingExecution.status === "in_progress") {
    const execution: PromptExecution = {
      id: existingExecution.executionId,
      promptText: existingExecution.promptText,
      executionTimestamp: existingExecution.startTimestamp.toISOString(),
      status: "in_progress",
      targetModel: "gpt-4o-mini",
    };

    const error: ExecutionError = {
      id: randomUUID(),
      promptExecutionId: existingExecution.executionId,
      errorType: "validation",
      errorMessage:
        "An execution is already in progress. Please wait or cancel it first.",
      timestamp: new Date().toISOString(),
    };

    const response: ExecutePromptErrorResponse = {
      execution,
      error,
    };

    return c.json(response, 409);
  }

  executionStateCacheService.clearCache();

  const executionId = randomUUID();
  const executionTimestamp = new Date().toISOString();

  try {
    const body = await c.req.json<ExecutePromptRequest>();
    const { promptText } = body;

    if (!promptText || promptText.trim().length === 0) {
      const execution: PromptExecution = {
        id: executionId,
        promptText: promptText || "",
        executionTimestamp,
        status: "failed",
        targetModel: "gpt-4o-mini",
      };

      const error: ExecutionError = {
        id: randomUUID(),
        promptExecutionId: executionId,
        errorType: "validation",
        errorMessage: "Prompt text cannot be empty",
        timestamp: new Date().toISOString(),
      };

      const response: ExecutePromptErrorResponse = {
        execution,
        error,
      };

      return c.json(response, 400);
    }

    const config = await getConfig();
    if (!config) {
      throw new Error(
        "No configuration found. Please configure API credentials.",
      );
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      throw new Error("No API key found. Please configure API credentials.");
    }

    const execution: PromptExecution = {
      id: executionId,
      promptText,
      executionTimestamp,
      status: "in_progress",
      targetModel: config.selectedModel,
    };

    const abortController = new AbortController();
    executionStateCacheService.setCurrentExecution(
      executionId,
      promptText,
      config.selectedModel,
      abortController,
    );

    logger.info(
      { executionId, model: config.selectedModel },
      "Executing LLM prompt",
    );

    try {
      const llmResult = await executePrompt(
        promptText,
        apiKey,
        config.selectedModel,
        abortController.signal,
      );

      const pricingData = await getPricingData();
      const exchangeRateData = await getExchangeRate();

      if (!pricingData || !exchangeRateData) {
        throw new Error("Pricing or exchange rate data not available");
      }

      const estimatedCostGBP = calculateCost(
        llmResult.inputTokenCount,
        llmResult.outputTokenCount,
        pricingData.inputTokenPriceUsd,
        pricingData.outputTokenPriceUsd,
        exchangeRateData.rate,
      );

      execution.status = "completed";

      const result: ExecutionResult = {
        id: randomUUID(),
        promptExecutionId: executionId,
        responseText: llmResult.responseText,
        inputTokenCount: llmResult.inputTokenCount,
        outputTokenCount: llmResult.outputTokenCount,
        totalTokenCount: llmResult.totalTokenCount,
        executionDurationMs: llmResult.executionDurationMs,
        estimatedCostGBP,
      };

      executionStateCacheService.setExecutionResult(result);

      const response: ExecutePromptSuccessResponse = {
        execution,
        result,
      };

      logger.info(
        {
          executionId,
          inputTokens: result.inputTokenCount,
          outputTokens: result.outputTokenCount,
          durationMs: result.executionDurationMs,
          costGBP: result.estimatedCostGBP,
        },
        "LLM prompt execution completed successfully",
      );

      return c.json(response, 200);
    } catch (error) {
      execution.status = "failed";

      const executionError = createExecutionError(
        executionId,
        error,
        error instanceof Error ? error.stack : undefined,
      );

      executionStateCacheService.setExecutionResult(executionError);

      const response: ExecutePromptErrorResponse = {
        execution,
        error: executionError,
      };

      let statusCode = 500;

      if (error instanceof LLMExecutionError) {
        switch (error.errorType) {
          case "authentication":
            statusCode = 401;
            break;
          case "validation":
            statusCode = 400;
            break;
          case "rate_limit":
            statusCode = 429;
            break;
          case "timeout":
            statusCode = 504;
            break;
          case "network":
          case "api_error":
          case "unknown":
          default:
            statusCode = 500;
            break;
        }
      } else {
        switch (executionError.errorType) {
          case "authentication":
            statusCode = 401;
            break;
          case "validation":
            statusCode = 400;
            break;
          case "rate_limit":
            statusCode = 429;
            break;
          case "timeout":
            statusCode = 504;
            break;
          case "network":
          case "api_error":
          case "unknown":
          default:
            statusCode = 500;
            break;
        }
      }

      logger.error(
        {
          executionId,
          errorType: executionError.errorType,
          errorMessage: executionError.errorMessage,
        },
        "LLM prompt execution failed",
      );

      return c.json(response, statusCode as 400 | 401 | 429 | 500 | 504);
    }
  } catch (error) {
    const execution: PromptExecution = {
      id: executionId,
      promptText: "",
      executionTimestamp,
      status: "failed",
      targetModel: "gpt-4o-mini",
    };

    const executionError = createExecutionError(
      executionId,
      error,
      error instanceof Error ? error.stack : undefined,
    );

    const response: ExecutePromptErrorResponse = {
      execution,
      error: executionError,
    };

    logger.error(
      {
        executionId,
        error: executionError.errorMessage,
      },
      "Failed to execute prompt due to system error",
    );

    return c.json(response, 500);
  }
});

export default router;

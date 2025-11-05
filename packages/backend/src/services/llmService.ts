import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import type { ErrorType } from "@promptalicious/shared-infra";

export interface LLMExecutionResult {
  responseText: string;
  inputTokenCount: number;
  outputTokenCount: number;
  totalTokenCount: number;
  executionDurationMs: number;
}

export class LLMExecutionError extends Error {
  constructor(
    message: string,
    public readonly errorType: ErrorType,
    public readonly errorCode?: string,
    public readonly additionalContext?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "LLMExecutionError";
  }
}

const executePromptInputSchema = z.object({
  promptText: z.string().trim().min(1, "Prompt text cannot be empty"),
  apiKey: z.string().trim().min(1, "API key is required"),
  model: z.string().min(1, "Model identifier is required"),
});

export async function executePrompt(
  promptText: string,
  apiKey: string,
  model: string,
): Promise<LLMExecutionResult> {
  const validationResult = executePromptInputSchema.safeParse({
    promptText,
    apiKey,
    model,
  });

  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0];
    throw new LLMExecutionError(
      firstError?.message ?? "Validation failed",
      "validation",
    );
  }

  const {
    promptText: validPrompt,
    apiKey: validApiKey,
    model: validModel,
  } = validationResult.data;

  const startTime = Date.now();

  try {
    const provider = createOpenAI({
      apiKey: validApiKey,
    });

    const result = await generateText({
      model: provider(validModel),
      prompt: validPrompt,
    });

    const executionDurationMs = Date.now() - startTime;

    return {
      responseText: result.text,
      inputTokenCount: result.usage.inputTokens ?? 0,
      outputTokenCount: result.usage.outputTokens ?? 0,
      totalTokenCount: result.usage.totalTokens ?? 0,
      executionDurationMs,
    };
  } catch (error) {
    const executionDurationMs = Date.now() - startTime;

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("api key") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("invalid_api_key")
      ) {
        throw new LLMExecutionError(
          "The API key provided is invalid. Please check your configuration.",
          "authentication",
          "invalid_api_key",
          { originalError: error.message, executionDurationMs },
        );
      }

      if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
        throw new LLMExecutionError(
          "Rate limit exceeded. Please try again later.",
          "rate_limit",
          "rate_limit_exceeded",
          { originalError: error.message, executionDurationMs },
        );
      }

      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("timed out")
      ) {
        throw new LLMExecutionError(
          "The LLM request timed out.",
          "timeout",
          "request_timeout",
          { originalError: error.message, executionDurationMs },
        );
      }

      if (
        errorMessage.includes("network") ||
        errorMessage.includes("fetch") ||
        errorMessage.includes("econnrefused")
      ) {
        throw new LLMExecutionError(
          "Unable to connect to OpenAI API. Please check your internet connection.",
          "network",
          "network_error",
          { originalError: error.message, executionDurationMs },
        );
      }

      throw new LLMExecutionError(
        error.message || "An unknown error occurred during LLM execution",
        "api_error",
        "unknown_api_error",
        { originalError: error.message, executionDurationMs },
      );
    }

    throw new LLMExecutionError(
      "An unknown error occurred during LLM execution",
      "unknown",
      undefined,
      { originalError: String(error), executionDurationMs },
    );
  }
}

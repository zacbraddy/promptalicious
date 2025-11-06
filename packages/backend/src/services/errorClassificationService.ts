import { randomUUID } from "crypto";

import type { ErrorType, ExecutionError } from "@promptalicious/shared-infra";

import { LLMExecutionError } from "./llmService";

export interface ClassifiedError {
  errorType: ErrorType;
  errorCode?: string;
  errorMessage: string;
  additionalContext?: Record<string, unknown>;
}

export function classifyError(error: unknown): ClassifiedError {
  if (error instanceof LLMExecutionError) {
    return {
      errorType: error.errorType,
      errorCode: error.errorCode,
      errorMessage: error.message,
      additionalContext: error.additionalContext,
    };
  }

  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    const existingContext =
      (error as Error & { additionalContext?: Record<string, unknown> })
        .additionalContext || {};

    if (error.name === "AbortError" || errorMessage.includes("abort")) {
      return {
        errorType: "aborted",
        errorCode: "execution_aborted",
        errorMessage: "The execution was cancelled by the user.",
        additionalContext: {
          originalError: error.message,
          ...existingContext,
        },
      };
    }

    if (
      errorMessage.includes("api key") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("invalid_api_key") ||
      errorMessage.includes("401")
    ) {
      return {
        errorType: "authentication",
        errorCode: "invalid_api_key",
        errorMessage:
          "The API key provided is invalid. Please check your configuration.",
        additionalContext: {
          originalError: error.message,
          ...existingContext,
        },
      };
    }

    if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
      return {
        errorType: "rate_limit",
        errorCode: "rate_limit_exceeded",
        errorMessage: "Rate limit exceeded. Please try again later.",
        additionalContext: {
          originalError: error.message,
          ...existingContext,
        },
      };
    }

    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("timed out") ||
      errorMessage.includes("504")
    ) {
      return {
        errorType: "timeout",
        errorCode: "request_timeout",
        errorMessage: error.message,
        additionalContext: {
          originalError: error.message,
          ...existingContext,
        },
      };
    }

    if (
      errorMessage.includes("network") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("econnrefused") ||
      errorMessage.includes("enotfound") ||
      errorMessage.includes("connection")
    ) {
      return {
        errorType: "network",
        errorCode: "network_error",
        errorMessage:
          "Unable to connect to OpenAI API. Please check your internet connection.",
        additionalContext: {
          originalError: error.message,
          ...existingContext,
        },
      };
    }

    if (
      errorMessage.includes("validation") ||
      errorMessage.includes("invalid") ||
      errorMessage.includes("required")
    ) {
      return {
        errorType: "validation",
        errorCode: "validation_error",
        errorMessage: error.message,
        additionalContext: {
          originalError: error.message,
          ...existingContext,
        },
      };
    }

    return {
      errorType: "api_error",
      errorCode: "unknown_api_error",
      errorMessage: error.message || "An API error occurred",
      additionalContext: {
        originalError: error.message,
        ...existingContext,
      },
    };
  }

  return {
    errorType: "unknown",
    errorMessage: "An unknown error occurred",
    additionalContext: {
      originalError: String(error),
    },
  };
}

export function createExecutionError(
  promptExecutionId: string,
  error: unknown,
  stackTrace?: string,
): ExecutionError {
  const classified = classifyError(error);

  return {
    id: randomUUID(),
    promptExecutionId,
    errorType: classified.errorType,
    errorCode: classified.errorCode,
    errorMessage: classified.errorMessage,
    stackTrace,
    additionalContext: classified.additionalContext,
    timestamp: new Date().toISOString(),
  };
}

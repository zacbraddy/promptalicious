import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { logger } from "../lib/logger.js";

export interface ErrorResponse {
  error: {
    errorType: string;
    errorMessage: string;
    errorCode?: string;
    additionalContext?: Record<string, unknown>;
  };
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorType: string,
    message: string,
    public readonly errorCode?: string,
    public readonly additionalContext?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err: Error, c: Context) {
  let statusCode = 500;
  let errorType = "unknown";
  let errorMessage = "Internal server error";
  let errorCode: string | undefined;
  let additionalContext: Record<string, unknown> | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorType = err.errorType;
    errorMessage = err.message;
    errorCode = err.errorCode;
    additionalContext = err.additionalContext;
  } else if (err instanceof HTTPException) {
    statusCode = err.status;
    errorMessage = err.message;
    errorType = mapStatusCodeToErrorType(statusCode);
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    errorType = "validation";
    errorMessage = err.message;
  } else if (err.message.includes("ECONNREFUSED")) {
    statusCode = 500;
    errorType = "network";
    errorMessage = "Unable to connect to external service";
  } else if (
    err.message.includes("timeout") ||
    err.message.includes("ETIMEDOUT")
  ) {
    statusCode = 504;
    errorType = "timeout";
    errorMessage = "Request timed out";
  }

  logger.error(
    {
      err,
      path: c.req.path,
      method: c.req.method,
      statusCode,
      errorType,
      errorCode,
      additionalContext,
    },
    `Error: ${errorMessage}`,
  );

  const response: ErrorResponse = {
    error: {
      errorType,
      errorMessage,
      ...(errorCode && { errorCode }),
      ...(additionalContext && { additionalContext }),
    },
  };

  return c.json(response, statusCode as 200 | 400 | 401 | 429 | 500 | 504);
}

function mapStatusCodeToErrorType(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return "validation";
    case 401:
      return "authentication";
    case 429:
      return "rate_limit";
    case 504:
      return "timeout";
    default:
      return "api_error";
  }
}

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ExecutionError } from "@promptalicious/shared-infra";

import { ErrorDisplay } from "@/components/ErrorDisplay";

const createMockError = (
  overrides: Partial<ExecutionError> = {},
): ExecutionError => ({
  id: "error-integration-123",
  promptExecutionId: "execution-integration-456",
  errorType: "unknown",
  errorMessage: "Default error message",
  timestamp: new Date().toISOString(),
  ...overrides,
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe("ErrorDisplay - Integration Tests for All Error Types", () => {
  describe("Authentication Errors", () => {
    it("should display authentication error with correct classification and actionable guidance", () => {
      const error = createMockError({
        errorType: "authentication",
        errorCode: "invalid_api_key",
        errorMessage:
          "The API key provided is invalid. Please check your configuration.",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Authentication Error")).toBeInTheDocument();
      expect(
        screen.getByText(
          "The API key provided is invalid. Please check your configuration.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Error Code: invalid_api_key/),
      ).toBeInTheDocument();

      const settingsLink = screen.getByRole("link", { name: /Settings/i });
      expect(settingsLink).toBeInTheDocument();
      expect(settingsLink).toHaveAttribute("href", "/settings");
    });

    it("should display authentication error with missing credentials", () => {
      const error = createMockError({
        errorType: "authentication",
        errorMessage: "No API key configured. Please set up your credentials.",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Authentication Error")).toBeInTheDocument();
      expect(
        screen.getByText(
          "No API key configured. Please set up your credentials.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Please check your API credentials/i),
      ).toBeInTheDocument();
    });
  });

  describe("Network Errors", () => {
    it("should display network error with correct classification and guidance", () => {
      const error = createMockError({
        errorType: "network",
        errorMessage: "Connection to server failed.",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Network Error")).toBeInTheDocument();
      expect(
        screen.getByText("Connection to server failed."),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/check your internet connection and try again/i),
      ).toBeInTheDocument();
    });

    it("should display network error with DNS resolution failure", () => {
      const error = createMockError({
        errorType: "network",
        errorCode: "ENOTFOUND",
        errorMessage: "Could not resolve hostname. DNS lookup failed.",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Network Error")).toBeInTheDocument();
      expect(
        screen.getByText("Could not resolve hostname. DNS lookup failed."),
      ).toBeInTheDocument();
      expect(screen.getByText(/Error Code: ENOTFOUND/)).toBeInTheDocument();
    });
  });

  describe("API Errors", () => {
    it("should display API error with correct classification", () => {
      const error = createMockError({
        errorType: "api_error",
        errorCode: "invalid_request_error",
        errorMessage: "The model 'invalid-model' does not exist.",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("API Error")).toBeInTheDocument();
      expect(
        screen.getByText("The model 'invalid-model' does not exist."),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Error Code: invalid_request_error/),
      ).toBeInTheDocument();
    });

    it("should display API error with additional context", () => {
      const error = createMockError({
        errorType: "api_error",
        errorCode: "context_length_exceeded",
        errorMessage:
          "Request exceeds maximum context length for the selected model.",
        additionalContext: {
          maxTokens: 128000,
          requestedTokens: 150000,
        },
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("API Error")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Request exceeds maximum context length for the selected model.",
        ),
      ).toBeInTheDocument();

      expect(screen.getByText("Additional Details")).toBeInTheDocument();
    });
  });

  describe("Timeout Errors", () => {
    it("should display timeout error with correct classification and guidance", () => {
      const error = createMockError({
        errorType: "timeout",
        errorMessage: "The LLM request timed out after 60 seconds.",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Request Timeout")).toBeInTheDocument();
      expect(
        screen.getByText("The LLM request timed out after 60 seconds."),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/took too long to complete/i),
      ).toBeInTheDocument();
    });

    it("should display timeout error with suggested action", () => {
      const error = createMockError({
        errorType: "timeout",
        errorMessage:
          "Request exceeded time limit. Consider using a shorter prompt.",
        additionalContext: {
          timeoutMs: 60000,
        },
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Request Timeout")).toBeInTheDocument();
      expect(
        screen.getByText(/Try again with a shorter prompt/i),
      ).toBeInTheDocument();
    });
  });

  describe("Rate Limit Errors", () => {
    it("should display rate limit error with correct classification", () => {
      const error = createMockError({
        errorType: "rate_limit",
        errorCode: "rate_limit_exceeded",
        errorMessage: "Rate limit exceeded. Please try again in 60 seconds.",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Rate Limit Exceeded")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Rate limit exceeded. Please try again in 60 seconds.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/exceeded the API rate limit/i),
      ).toBeInTheDocument();
    });

    it("should display rate limit error with retry-after context", () => {
      const error = createMockError({
        errorType: "rate_limit",
        errorCode: "rate_limit_exceeded",
        errorMessage: "Too many requests. Please wait before retrying.",
        additionalContext: {
          retryAfter: 120,
          currentQuota: 0,
          resetTime: "2025-11-07T16:00:00Z",
        },
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Rate Limit Exceeded")).toBeInTheDocument();
      expect(
        screen.getByText("Too many requests. Please wait before retrying."),
      ).toBeInTheDocument();

      expect(screen.getByText("Additional Details")).toBeInTheDocument();
    });
  });

  describe("Validation Errors", () => {
    it("should display validation error with correct classification and guidance", () => {
      const error = createMockError({
        errorType: "validation",
        errorMessage: "Prompt text cannot be empty.",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Validation Error")).toBeInTheDocument();
      expect(
        screen.getByText("Prompt text cannot be empty."),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/check your input and ensure/i),
      ).toBeInTheDocument();
    });

    it("should display validation error for invalid input length", () => {
      const error = createMockError({
        errorType: "validation",
        errorMessage:
          "Prompt text exceeds maximum length of 50,000 characters.",
        additionalContext: {
          maxLength: 50000,
          actualLength: 51234,
        },
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Validation Error")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Prompt text exceeds maximum length of 50,000 characters.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Additional Details")).toBeInTheDocument();
    });
  });

  describe("Aborted Errors", () => {
    it("should display aborted error with correct classification and guidance", () => {
      const error = createMockError({
        errorType: "aborted",
        errorMessage: "Execution was cancelled by user.",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Execution Cancelled")).toBeInTheDocument();
      expect(
        screen.getByText("Execution was cancelled by user."),
      ).toBeInTheDocument();
      expect(screen.getByText(/start a new execution/i)).toBeInTheDocument();
    });

    it("should display aborted error during processing", () => {
      const error = createMockError({
        errorType: "aborted",
        errorMessage: "Execution cancelled while waiting for LLM response.",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Execution Cancelled")).toBeInTheDocument();
      expect(
        screen.getByText("Execution cancelled while waiting for LLM response."),
      ).toBeInTheDocument();
    });
  });

  describe("Unknown Errors", () => {
    it("should display unknown error with correct classification", () => {
      const error = createMockError({
        errorType: "unknown",
        errorMessage: "An unexpected error occurred. Please try again.",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Unknown Error")).toBeInTheDocument();
      expect(
        screen.getByText("An unexpected error occurred. Please try again."),
      ).toBeInTheDocument();
    });

    it("should display unknown error with stack trace details", () => {
      const error = createMockError({
        errorType: "unknown",
        errorMessage: "Unexpected error during execution.",
        stackTrace: "Error: Unexpected error\n  at execute (file.ts:123)",
        additionalContext: {
          errorCode: "UNKNOWN_ERROR",
          timestamp: "2025-11-07T15:30:00Z",
        },
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Unknown Error")).toBeInTheDocument();
      expect(
        screen.getByText("Unexpected error during execution."),
      ).toBeInTheDocument();
      expect(screen.getByText("Additional Details")).toBeInTheDocument();
    });
  });

  describe("Error Display Consistency", () => {
    it("should consistently display error code when provided across all error types", () => {
      const errorTypes: Array<ExecutionError["errorType"]> = [
        "authentication",
        "network",
        "api_error",
        "timeout",
        "rate_limit",
        "validation",
        "aborted",
        "unknown",
      ];

      errorTypes.forEach((errorType) => {
        const error = createMockError({
          errorType,
          errorCode: `TEST_CODE_${errorType.toUpperCase()}`,
          errorMessage: `Test error for ${errorType}`,
        });

        const { unmount } = renderWithRouter(<ErrorDisplay error={error} />);

        expect(
          screen.getByText(
            new RegExp(`Error Code: TEST_CODE_${errorType.toUpperCase()}`),
          ),
        ).toBeInTheDocument();

        unmount();
      });
    });

    it("should display additional context for all error types when provided", () => {
      const errorTypes: Array<ExecutionError["errorType"]> = [
        "authentication",
        "network",
        "api_error",
        "timeout",
        "rate_limit",
        "validation",
        "aborted",
        "unknown",
      ];

      errorTypes.forEach((errorType) => {
        const error = createMockError({
          errorType,
          errorMessage: `Test error for ${errorType}`,
          additionalContext: {
            testKey: `testValue_${errorType}`,
          },
        });

        const { unmount } = renderWithRouter(<ErrorDisplay error={error} />);

        expect(screen.getByText("Additional Details")).toBeInTheDocument();

        unmount();
      });
    });

    it("should render all error types without crashing", () => {
      const errorTypes: Array<ExecutionError["errorType"]> = [
        "authentication",
        "network",
        "api_error",
        "timeout",
        "rate_limit",
        "validation",
        "aborted",
        "unknown",
      ];

      errorTypes.forEach((errorType) => {
        const error = createMockError({
          errorType,
          errorCode: `ERR_${errorType.toUpperCase()}`,
          errorMessage: `This is a ${errorType} error`,
          additionalContext: {
            timestamp: new Date().toISOString(),
            errorType: errorType,
          },
        });

        const { unmount } = renderWithRouter(<ErrorDisplay error={error} />);

        const alertElement = screen.getByRole("alert");
        expect(alertElement).toBeInTheDocument();

        expect(
          screen.getByText(`This is a ${errorType} error`),
        ).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe("Error Guidance Verification", () => {
    it("should provide actionable guidance for recoverable errors", () => {
      const recoverableErrors: Array<{
        type: ExecutionError["errorType"];
        expectedGuidance: RegExp;
      }> = [
        {
          type: "authentication",
          expectedGuidance: /Please check your API credentials/i,
        },
        {
          type: "network",
          expectedGuidance: /check your internet connection/i,
        },
        { type: "timeout", expectedGuidance: /took too long to complete/i },
        {
          type: "rate_limit",
          expectedGuidance: /exceeded the API rate limit/i,
        },
        {
          type: "validation",
          expectedGuidance: /check your input and ensure/i,
        },
        { type: "aborted", expectedGuidance: /start a new execution/i },
      ];

      recoverableErrors.forEach(({ type, expectedGuidance }) => {
        const error = createMockError({
          errorType: type,
          errorMessage: `Test ${type} error`,
        });

        const { unmount } = renderWithRouter(<ErrorDisplay error={error} />);

        expect(screen.getByText(expectedGuidance)).toBeInTheDocument();

        unmount();
      });
    });

    it("should not provide generic guidance for api_error and unknown error types", () => {
      const nonGuidedErrors: Array<ExecutionError["errorType"]> = [
        "api_error",
        "unknown",
      ];

      nonGuidedErrors.forEach((errorType) => {
        const error = createMockError({
          errorType,
          errorMessage: `Test ${errorType} error`,
        });

        const { unmount } = renderWithRouter(<ErrorDisplay error={error} />);

        expect(screen.queryByText(/Please check/i)).not.toBeInTheDocument();

        unmount();
      });
    });
  });
});

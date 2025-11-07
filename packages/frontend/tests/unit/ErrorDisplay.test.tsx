import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import type { ExecutionError } from "@promptalicious/shared-infra";

import { ErrorDisplay } from "@/components/ErrorDisplay";

const createMockError = (
  overrides: Partial<ExecutionError> = {},
): ExecutionError => ({
  id: "error-123",
  promptExecutionId: "execution-456",
  errorType: "unknown",
  errorMessage: "Something went wrong",
  timestamp: "2025-11-07T10:00:00.000Z",
  ...overrides,
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("ErrorDisplay", () => {
  describe("Error Type Classification", () => {
    it("should display authentication error with correct title and icon", () => {
      const error = createMockError({
        errorType: "authentication",
        errorMessage: "Invalid API key",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Authentication Error")).toBeInTheDocument();
      expect(screen.getByText("Invalid API key")).toBeInTheDocument();
    });

    it("should display network error with correct title", () => {
      const error = createMockError({
        errorType: "network",
        errorMessage: "Unable to connect to server",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Network Error")).toBeInTheDocument();
      expect(
        screen.getByText("Unable to connect to server"),
      ).toBeInTheDocument();
    });

    it("should display timeout error with correct title", () => {
      const error = createMockError({
        errorType: "timeout",
        errorMessage: "Request timed out",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Request Timeout")).toBeInTheDocument();
      expect(screen.getByText("Request timed out")).toBeInTheDocument();
    });

    it("should display rate limit error with correct title", () => {
      const error = createMockError({
        errorType: "rate_limit",
        errorMessage: "Too many requests",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Rate Limit Exceeded")).toBeInTheDocument();
      expect(screen.getByText("Too many requests")).toBeInTheDocument();
    });

    it("should display validation error with correct title", () => {
      const error = createMockError({
        errorType: "validation",
        errorMessage: "Invalid input",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Validation Error")).toBeInTheDocument();
      expect(screen.getByText("Invalid input")).toBeInTheDocument();
    });

    it("should display aborted error with correct title", () => {
      const error = createMockError({
        errorType: "aborted",
        errorMessage: "Execution cancelled by user",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Execution Cancelled")).toBeInTheDocument();
      expect(
        screen.getByText("Execution cancelled by user"),
      ).toBeInTheDocument();
    });

    it("should display api_error with correct title", () => {
      const error = createMockError({
        errorType: "api_error",
        errorMessage: "API returned an error",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("API Error")).toBeInTheDocument();
      expect(screen.getByText("API returned an error")).toBeInTheDocument();
    });

    it("should display unknown error with correct title", () => {
      const error = createMockError({
        errorType: "unknown",
        errorMessage: "An unexpected error occurred",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Unknown Error")).toBeInTheDocument();
      expect(
        screen.getByText("An unexpected error occurred"),
      ).toBeInTheDocument();
    });
  });

  describe("Error Message Display", () => {
    it("should display the error message", () => {
      const error = createMockError({
        errorMessage: "This is a test error message",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(
        screen.getByText("This is a test error message"),
      ).toBeInTheDocument();
    });
  });

  describe("Error Code Display", () => {
    it("should display error code when provided", () => {
      const error = createMockError({
        errorCode: "ERR_AUTH_001",
        errorMessage: "Authentication failed",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText(/Error Code: ERR_AUTH_001/)).toBeInTheDocument();
    });

    it("should not display error code section when not provided", () => {
      const error = createMockError({
        errorMessage: "No error code",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.queryByText(/Error Code:/)).not.toBeInTheDocument();
    });
  });

  describe("Additional Context Display", () => {
    it("should display additional context when provided", () => {
      const error = createMockError({
        errorMessage: "Error with context",
        additionalContext: {
          statusCode: 429,
          retryAfter: 60,
        },
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Additional Details")).toBeInTheDocument();
    });

    it("should not display additional context section when empty", () => {
      const error = createMockError({
        errorMessage: "No additional context",
        additionalContext: {},
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.queryByText("Additional Details")).not.toBeInTheDocument();
    });

    it("should not display additional context section when undefined", () => {
      const error = createMockError({
        errorMessage: "No additional context",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.queryByText("Additional Details")).not.toBeInTheDocument();
    });
  });

  describe("Actionable Guidance", () => {
    it("should display settings link for authentication errors", () => {
      const error = createMockError({
        errorType: "authentication",
        errorMessage: "Invalid credentials",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      const settingsLink = screen.getByRole("link", { name: /Settings/i });
      expect(settingsLink).toBeInTheDocument();
      expect(settingsLink).toHaveAttribute("href", "/settings");
    });

    it("should display guidance for rate limit errors", () => {
      const error = createMockError({
        errorType: "rate_limit",
        errorMessage: "Too many requests",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(
        screen.getByText(/exceeded the API rate limit/i),
      ).toBeInTheDocument();
    });

    it("should display guidance for network errors", () => {
      const error = createMockError({
        errorType: "network",
        errorMessage: "Connection failed",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(
        screen.getByText(/check your internet connection/i),
      ).toBeInTheDocument();
    });

    it("should display guidance for timeout errors", () => {
      const error = createMockError({
        errorType: "timeout",
        errorMessage: "Request timeout",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(
        screen.getByText(/took too long to complete/i),
      ).toBeInTheDocument();
    });

    it("should display guidance for validation errors", () => {
      const error = createMockError({
        errorType: "validation",
        errorMessage: "Invalid input",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(
        screen.getByText(/check your input and ensure/i),
      ).toBeInTheDocument();
    });

    it("should display guidance for aborted errors", () => {
      const error = createMockError({
        errorType: "aborted",
        errorMessage: "Cancelled",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText(/start a new execution/i)).toBeInTheDocument();
    });

    it("should not display guidance for unknown errors", () => {
      const error = createMockError({
        errorType: "unknown",
        errorMessage: "Something happened",
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.queryByText(/Please/i)).not.toBeInTheDocument();
    });
  });

  describe("Component Structure", () => {
    it("should render as an alert with destructive variant", () => {
      const error = createMockError();

      const { container } = renderWithRouter(<ErrorDisplay error={error} />);

      const alert = container.querySelector('[role="alert"]');
      expect(alert).toBeInTheDocument();
    });

    it("should display all error information in a structured format", () => {
      const error = createMockError({
        errorType: "authentication",
        errorCode: "ERR_001",
        errorMessage: "Test error",
        additionalContext: { key: "value" },
      });

      renderWithRouter(<ErrorDisplay error={error} />);

      expect(screen.getByText("Authentication Error")).toBeInTheDocument();
      expect(screen.getByText("Test error")).toBeInTheDocument();
      expect(screen.getByText(/Error Code: ERR_001/)).toBeInTheDocument();
      expect(screen.getByText("Additional Details")).toBeInTheDocument();
    });
  });
});

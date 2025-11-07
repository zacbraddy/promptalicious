import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ExecutePromptSuccessResponse } from "@promptalicious/shared-infra";

import { ExecutePromptPage } from "@/pages/ExecutePromptPage";
import * as apiClient from "@/services/apiClient";

vi.mock("@/services/apiClient");

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("ExecutePromptPage Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Full page interaction - successful execution", () => {
    it("should render all components and handle successful prompt execution", async () => {
      const user = userEvent.setup();

      const mockSuccessResponse: ExecutePromptSuccessResponse = {
        execution: {
          id: "exec-123",
          promptText: "Test prompt",
          targetModel: "gpt-4o-mini",
          status: "completed",
          executionTimestamp: new Date().toISOString(),
        },
        result: {
          id: "result-123",
          promptExecutionId: "exec-123",
          responseText: "This is the LLM response",
          inputTokenCount: 10,
          outputTokenCount: 20,
          totalTokenCount: 30,
          executionDurationMs: 1500,
          estimatedCostGBP: 0.000045,
        },
      };

      vi.mocked(apiClient.executePrompt).mockResolvedValue(mockSuccessResponse);

      render(<ExecutePromptPage />, { wrapper: createWrapper() });

      // Verify page header renders
      expect(
        screen.getByRole("heading", { name: /execute prompt/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /enter a system prompt, execute it against your configured llm/i,
        ),
      ).toBeInTheDocument();

      // Verify prompt input section renders
      expect(screen.getByText("System Prompt")).toBeInTheDocument();
      const textarea = screen.getByPlaceholderText(
        /enter your system prompt here/i,
      );
      expect(textarea).toBeInTheDocument();

      // Verify execute button is initially disabled (empty prompt)
      const executeButton = screen.getByRole("button", { name: /execute/i });
      expect(executeButton).toBeDisabled();

      // Enter prompt text
      await user.type(textarea, "Test prompt");

      // Execute button should now be enabled
      await waitFor(() => {
        expect(executeButton).toBeEnabled();
      });

      // Click execute button
      await user.click(executeButton);

      // Verify API was called with correct data
      expect(apiClient.executePrompt).toHaveBeenCalled();
      const callArgs = vi.mocked(apiClient.executePrompt).mock.calls[0];
      expect(callArgs?.[0]).toEqual({ promptText: "Test prompt" });

      // Wait for results to appear
      await waitFor(() => {
        expect(
          screen.getByText("This is the LLM response"),
        ).toBeInTheDocument();
      });

      // Verify response section renders
      expect(screen.getByText("Response")).toBeInTheDocument();

      // Verify diagnostics section renders
      expect(screen.getByText("Diagnostics")).toBeInTheDocument();

      // Verify diagnostics table data
      expect(screen.getByText("Input Tokens")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("Output Tokens")).toBeInTheDocument();
      expect(screen.getByText("20")).toBeInTheDocument();
      expect(screen.getByText("Total Tokens")).toBeInTheDocument();
      expect(screen.getByText("30")).toBeInTheDocument();
      expect(screen.getByText("Execution Duration")).toBeInTheDocument();
      expect(screen.getByText("1,500 ms")).toBeInTheDocument();
      expect(screen.getByText("Estimated Cost")).toBeInTheDocument();
      expect(screen.getByText("£0.000045")).toBeInTheDocument();

      // Verify prompt text is preserved after execution
      expect(textarea).toHaveValue("Test prompt");
    });
  });

  describe("Full page interaction - error handling", () => {
    it("should display error when execution fails", async () => {
      const user = userEvent.setup();

      const mockError = new Error("Authentication failed");

      vi.mocked(apiClient.executePrompt).mockRejectedValue(mockError);

      render(<ExecutePromptPage />, { wrapper: createWrapper() });

      const textarea = screen.getByPlaceholderText(
        /enter your system prompt here/i,
      );
      const executeButton = screen.getByRole("button", { name: /execute/i });

      // Enter prompt and execute
      await user.type(textarea, "Test prompt");
      await user.click(executeButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText("Authentication failed")).toBeInTheDocument();
      });

      // Verify error section renders
      expect(screen.getByText("Execution Failed")).toBeInTheDocument();

      // Verify prompt text is preserved after error
      expect(textarea).toHaveValue("Test prompt");

      // Verify results section does NOT render
      expect(screen.queryByText("Response")).not.toBeInTheDocument();
      expect(screen.queryByText("Diagnostics")).not.toBeInTheDocument();
    });
  });

  describe("Cancel functionality", () => {
    it("should have cancel button disabled when not executing", () => {
      render(<ExecutePromptPage />, { wrapper: createWrapper() });

      const cancelButton = screen.getByRole("button", { name: /cancel/i });

      // Cancel should be disabled initially
      expect(cancelButton).toBeDisabled();
    });

    it("should enable cancel button during execution", async () => {
      const user = userEvent.setup();

      let resolvePromise: (value: ExecutePromptSuccessResponse) => void;
      const mockPromise = new Promise<ExecutePromptSuccessResponse>(
        (resolve) => {
          resolvePromise = resolve;
        },
      );

      vi.mocked(apiClient.executePrompt).mockReturnValue(mockPromise);

      render(<ExecutePromptPage />, { wrapper: createWrapper() });

      const textarea = screen.getByPlaceholderText(
        /enter your system prompt here/i,
      );
      const executeButton = screen.getByRole("button", { name: /execute/i });
      const cancelButton = screen.getByRole("button", { name: /cancel/i });

      // Enter prompt and execute
      await user.type(textarea, "Test prompt");
      await user.click(executeButton);

      // Cancel button should be enabled during execution
      await waitFor(() => {
        expect(cancelButton).toBeEnabled();
      });

      // Resolve to complete the test
      const mockSuccessResponse: ExecutePromptSuccessResponse = {
        execution: {
          id: "exec-123",
          promptText: "Test prompt",
          targetModel: "gpt-4o-mini",
          status: "completed",
          executionTimestamp: new Date().toISOString(),
        },
        result: {
          id: "result-123",
          promptExecutionId: "exec-123",
          responseText: "Response",
          inputTokenCount: 10,
          outputTokenCount: 20,
          totalTokenCount: 30,
          executionDurationMs: 1500,
          estimatedCostGBP: 0.000045,
        },
      };
      resolvePromise!(mockSuccessResponse);

      // After execution completes, cancel should be disabled again
      await waitFor(() => {
        expect(cancelButton).toBeDisabled();
      });
    });
  });

  describe("State management validation", () => {
    it("should properly manage loading state during execution", async () => {
      const user = userEvent.setup();

      let resolvePromise: (value: ExecutePromptSuccessResponse) => void;
      const mockPromise = new Promise<ExecutePromptSuccessResponse>(
        (resolve) => {
          resolvePromise = resolve;
        },
      );

      vi.mocked(apiClient.executePrompt).mockReturnValue(mockPromise);

      render(<ExecutePromptPage />, { wrapper: createWrapper() });

      const textarea = screen.getByPlaceholderText(
        /enter your system prompt here/i,
      );
      const executeButton = screen.getByRole("button", { name: /execute/i });

      // Enter prompt and execute
      await user.type(textarea, "Test prompt");
      await user.click(executeButton);

      // Verify loading state
      await waitFor(() => {
        expect(executeButton).toBeDisabled();
        expect(textarea).toBeDisabled();
      });

      // Resolve the promise
      const mockSuccessResponse: ExecutePromptSuccessResponse = {
        execution: {
          id: "exec-123",
          promptText: "Test prompt",
          targetModel: "gpt-4o-mini",
          status: "completed",
          executionTimestamp: new Date().toISOString(),
        },
        result: {
          id: "result-123",
          promptExecutionId: "exec-123",
          responseText: "Response",
          inputTokenCount: 10,
          outputTokenCount: 20,
          totalTokenCount: 30,
          executionDurationMs: 1500,
          estimatedCostGBP: 0.000045,
        },
      };
      resolvePromise!(mockSuccessResponse);

      // Verify loading state is cleared
      await waitFor(() => {
        expect(executeButton).toBeEnabled();
        expect(textarea).toBeEnabled();
      });
    });
  });

  describe("Conditional rendering validation", () => {
    it("should not show results or errors on initial render", () => {
      render(<ExecutePromptPage />, { wrapper: createWrapper() });

      // Verify only input section is visible initially
      expect(screen.getByText("System Prompt")).toBeInTheDocument();
      expect(screen.queryByText("Response")).not.toBeInTheDocument();
      expect(screen.queryByText("Diagnostics")).not.toBeInTheDocument();
      expect(screen.queryByText("Execution Failed")).not.toBeInTheDocument();
    });

    it("should only show results when execution succeeds", async () => {
      const user = userEvent.setup();

      const mockSuccessResponse: ExecutePromptSuccessResponse = {
        execution: {
          id: "exec-123",
          promptText: "Test prompt",
          targetModel: "gpt-4o-mini",
          status: "completed",
          executionTimestamp: new Date().toISOString(),
        },
        result: {
          id: "result-123",
          promptExecutionId: "exec-123",
          responseText: "Response",
          inputTokenCount: 10,
          outputTokenCount: 20,
          totalTokenCount: 30,
          executionDurationMs: 1500,
          estimatedCostGBP: 0.000045,
        },
      };

      vi.mocked(apiClient.executePrompt).mockResolvedValue(mockSuccessResponse);

      render(<ExecutePromptPage />, { wrapper: createWrapper() });

      const textarea = screen.getByPlaceholderText(
        /enter your system prompt here/i,
      );
      const executeButton = screen.getByRole("button", { name: /execute/i });

      await user.type(textarea, "Test prompt");
      await user.click(executeButton);

      // Wait for the actual response text to appear
      await waitFor(() => {
        expect(screen.getByText("Response", { selector: "h2" })).toBeVisible();
      });

      // Verify error section does NOT appear
      expect(screen.queryByText("Execution Failed")).not.toBeInTheDocument();
    });

    it("should only show error when execution fails", async () => {
      const user = userEvent.setup();

      vi.mocked(apiClient.executePrompt).mockRejectedValue(
        new Error("Test error"),
      );

      render(<ExecutePromptPage />, { wrapper: createWrapper() });

      const textarea = screen.getByPlaceholderText(
        /enter your system prompt here/i,
      );
      const executeButton = screen.getByRole("button", { name: /execute/i });

      await user.type(textarea, "Test prompt");
      await user.click(executeButton);

      await waitFor(() => {
        expect(screen.getByText("Test error")).toBeInTheDocument();
      });

      // Verify results section does NOT appear
      expect(screen.queryByText("Response")).not.toBeInTheDocument();
      expect(screen.queryByText("Diagnostics")).not.toBeInTheDocument();
    });
  });
});

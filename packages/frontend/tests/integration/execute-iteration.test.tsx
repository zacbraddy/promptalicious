import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type {
  ExecutionStatusResponse,
  ExecutePromptSuccessResponse,
} from "@promptalicious/shared-infra";

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
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe("ExecutePromptPage - Iterative Refinement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should preserve prompt text and replace result when executing iteratively", async () => {
    const user = userEvent.setup();

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    const firstPrompt = "Explain TypeScript generics in 2-3 sentences";
    const firstResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-first-iteration",
        promptText: firstPrompt,
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-first-iteration",
        promptExecutionId: "exec-first-iteration",
        responseText:
          "TypeScript generics allow you to create reusable components that work with multiple types. They enable type-safe code without sacrificing flexibility. Generics use type parameters to capture and preserve type information.",
        inputTokenCount: 12,
        outputTokenCount: 45,
        totalTokenCount: 57,
        executionDurationMs: 1800,
        estimatedCostGBP: 0.000082,
      },
    };

    const secondPrompt =
      "Explain TypeScript generics with a code example (modified prompt)";
    const secondResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-second-iteration",
        promptText: secondPrompt,
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-second-iteration",
        promptExecutionId: "exec-second-iteration",
        responseText:
          "Here's a TypeScript generic example:\n\nfunction identity<T>(arg: T): T {\n  return arg;\n}\n\nconst result = identity<string>('hello'); // result is string\nconst num = identity<number>(42); // num is number\n\nThis function works with any type while maintaining type safety.",
        inputTokenCount: 18,
        outputTokenCount: 68,
        totalTokenCount: 86,
        executionDurationMs: 2100,
        estimatedCostGBP: 0.000124,
      },
    };

    vi.mocked(apiClient.getExecutionStatus).mockResolvedValue(
      mockNoExecutionStatus,
    );

    let executionCount = 0;
    vi.mocked(apiClient.executePrompt).mockImplementation(() => {
      executionCount++;
      const response = executionCount === 1 ? firstResponse : secondResponse;
      return new Promise((resolve) => {
        setTimeout(() => resolve(response), 50);
      });
    });

    vi.mocked(apiClient.abortExecution).mockResolvedValue({
      success: true,
      message: "Aborted",
    });

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(apiClient.getExecutionStatus).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText(
      /enter your system prompt here/i,
    );
    const executeButton = screen.getByRole("button", { name: /execute/i });

    await user.type(textarea, firstPrompt);

    await waitFor(() => {
      expect(executeButton).toBeEnabled();
    });

    await user.click(executeButton);

    await waitFor(() => {
      expect(apiClient.executePrompt).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/TypeScript generics allow you to create/),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Response")).toBeInTheDocument();
    expect(screen.getByText("Diagnostics")).toBeInTheDocument();

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("57")).toBeInTheDocument();

    expect(screen.getByText("1,800 ms")).toBeInTheDocument();
    expect(screen.getByText("£0.000082")).toBeInTheDocument();

    await waitFor(() => {
      expect(textarea).toBeEnabled();
      expect(executeButton).toBeEnabled();
    });

    expect(textarea).toHaveValue(firstPrompt);

    await user.clear(textarea);
    await user.type(textarea, secondPrompt);

    await waitFor(() => {
      expect(executeButton).toBeEnabled();
    });

    expect(textarea).toHaveValue(secondPrompt);

    await user.click(executeButton);

    await waitFor(() => {
      expect(apiClient.executePrompt).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Here's a TypeScript generic example:/),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/TypeScript generics allow you to create/),
    ).not.toBeInTheDocument();

    expect(screen.getByText("Response")).toBeInTheDocument();
    expect(screen.getByText("Diagnostics")).toBeInTheDocument();

    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("68")).toBeInTheDocument();
    expect(screen.getByText("86")).toBeInTheDocument();

    expect(screen.getByText("2,100 ms")).toBeInTheDocument();
    expect(screen.getByText("£0.000124")).toBeInTheDocument();

    await waitFor(() => {
      expect(textarea).toBeEnabled();
      expect(executeButton).toBeEnabled();
    });

    expect(textarea).toHaveValue(secondPrompt);
  });

  it("should maintain prompt text when switching between successful and error states", async () => {
    const user = userEvent.setup();

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    const successPrompt = "This will succeed";
    const successResponse: ExecutePromptSuccessResponse = {
      execution: {
        id: "exec-success-state",
        promptText: successPrompt,
        targetModel: "gpt-4o-mini",
        status: "completed",
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: "result-success-state",
        promptExecutionId: "exec-success-state",
        responseText: "Success response text",
        inputTokenCount: 10,
        outputTokenCount: 20,
        totalTokenCount: 30,
        executionDurationMs: 1500,
        estimatedCostGBP: 0.00006,
      },
    };

    const errorPrompt = "This will fail (modified)";

    vi.mocked(apiClient.getExecutionStatus).mockResolvedValue(
      mockNoExecutionStatus,
    );

    let executionCount = 0;
    vi.mocked(apiClient.executePrompt).mockImplementation(() => {
      executionCount++;
      if (executionCount === 1) {
        return Promise.resolve(successResponse);
      }
      return Promise.reject(
        new Error("Simulated API error for testing iteration"),
      );
    });

    vi.mocked(apiClient.abortExecution).mockResolvedValue({
      success: true,
      message: "Aborted",
    });

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(apiClient.getExecutionStatus).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText(
      /enter your system prompt here/i,
    );
    const executeButton = screen.getByRole("button", { name: /execute/i });

    await user.type(textarea, successPrompt);

    await waitFor(() => {
      expect(executeButton).toBeEnabled();
    });

    await user.click(executeButton);

    await waitFor(() => {
      expect(screen.getByText("Success response text")).toBeInTheDocument();
    });

    expect(textarea).toHaveValue(successPrompt);

    await user.clear(textarea);
    await user.type(textarea, errorPrompt);

    await waitFor(() => {
      expect(executeButton).toBeEnabled();
    });

    await user.click(executeButton);

    await waitFor(() => {
      expect(apiClient.executePrompt).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(textarea).toBeEnabled();
    });

    expect(textarea).toHaveValue(errorPrompt);

    expect(screen.queryByText("Success response text")).not.toBeInTheDocument();
  });

  it("should allow rapid successive executions with different prompts", async () => {
    const user = userEvent.setup();

    const mockNoExecutionStatus: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
      result: undefined,
      error: undefined,
    };

    const prompts = [
      "First prompt",
      "Second prompt (modified)",
      "Third prompt (modified again)",
    ];

    const responses = prompts.map((prompt, index) => ({
      execution: {
        id: `exec-rapid-${index}`,
        promptText: prompt,
        targetModel: "gpt-4o-mini",
        status: "completed" as const,
        executionTimestamp: new Date().toISOString(),
      },
      result: {
        id: `result-rapid-${index}`,
        promptExecutionId: `exec-rapid-${index}`,
        responseText: `Response ${index + 1} for: ${prompt}`,
        inputTokenCount: 10 + index,
        outputTokenCount: 20 + index,
        totalTokenCount: 30 + index * 2,
        executionDurationMs: 1500 + index * 100,
        estimatedCostGBP: 0.00006 + index * 0.00001,
      },
    }));

    vi.mocked(apiClient.getExecutionStatus).mockResolvedValue(
      mockNoExecutionStatus,
    );

    let executionCount = 0;
    vi.mocked(apiClient.executePrompt).mockImplementation(() => {
      const response = responses[executionCount];
      executionCount++;
      return new Promise((resolve) => {
        setTimeout(() => resolve(response), 30);
      });
    });

    vi.mocked(apiClient.abortExecution).mockResolvedValue({
      success: true,
      message: "Aborted",
    });

    render(<ExecutePromptPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(apiClient.getExecutionStatus).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText(
      /enter your system prompt here/i,
    );
    const executeButton = screen.getByRole("button", { name: /execute/i });

    for (let i = 0; i < prompts.length; i++) {
      if (i > 0) {
        await user.clear(textarea);
      }
      await user.type(textarea, prompts[i]);

      await waitFor(() => {
        expect(executeButton).toBeEnabled();
      });

      await user.click(executeButton);

      await waitFor(() => {
        expect(
          screen.getByText(`Response ${i + 1} for: ${prompts[i]}`),
        ).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(textarea).toBeEnabled();
      });

      expect(textarea).toHaveValue(prompts[i]);

      if (i > 0) {
        expect(
          screen.queryByText(`Response ${i} for: ${prompts[i - 1]}`),
        ).not.toBeInTheDocument();
      }
    }

    expect(apiClient.executePrompt).toHaveBeenCalledTimes(prompts.length);
  });
});

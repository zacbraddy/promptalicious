import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ExecutionStatusResponse } from "@promptalicious/shared-infra";
import type { ReactNode } from "react";

import { useExecutionStatus } from "@/hooks/useExecutionStatus";
import * as apiClient from "@/services/apiClient";

vi.mock("@/services/apiClient");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return Wrapper;
}

describe("useExecutionStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch status on mount", async () => {
    const mockResponse: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
    };

    vi.mocked(apiClient.getExecutionStatus).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useExecutionStatus(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toEqual(mockResponse);
    expect(result.current.error).toBeNull();
    expect(apiClient.getExecutionStatus).toHaveBeenCalledTimes(1);
  });

  it("should poll when execution is in progress", async () => {
    const mockInProgressResponse: ExecutionStatusResponse = {
      isExecuting: true,
      execution: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        promptText: "Test prompt",
        executionTimestamp: "2025-11-04T10:37:00.000Z",
        status: "in_progress",
        targetModel: "gpt-4o-mini",
      },
    };

    vi.mocked(apiClient.getExecutionStatus).mockResolvedValue(
      mockInProgressResponse,
    );

    const { result } = renderHook(() => useExecutionStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.status?.isExecuting).toBe(true);
    });

    const initialCallCount = vi.mocked(apiClient.getExecutionStatus).mock.calls
      .length;

    await waitFor(
      () => {
        expect(apiClient.getExecutionStatus).toHaveBeenCalledTimes(
          initialCallCount + 1,
        );
      },
      { timeout: 3000 },
    );
  });

  it("should stop polling when execution completes", async () => {
    let callCount = 0;
    vi.mocked(apiClient.getExecutionStatus).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          isExecuting: true,
          execution: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            promptText: "Test prompt",
            executionTimestamp: "2025-11-04T10:37:00.000Z",
            status: "in_progress",
            targetModel: "gpt-4o-mini",
          },
        });
      }
      return Promise.resolve({
        isExecuting: false,
        execution: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          promptText: "Test prompt",
          executionTimestamp: "2025-11-04T10:37:00.000Z",
          status: "completed",
          targetModel: "gpt-4o-mini",
        },
        result: {
          id: "660e8400-e29b-41d4-a716-446655440001",
          promptExecutionId: "550e8400-e29b-41d4-a716-446655440000",
          responseText: "Test response",
          inputTokenCount: 10,
          outputTokenCount: 20,
          totalTokenCount: 30,
          executionDurationMs: 1000,
          estimatedCostGBP: 0.001,
        },
      });
    });

    const { result } = renderHook(() => useExecutionStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.status?.isExecuting).toBe(true);
    });

    await waitFor(
      () => {
        expect(result.current.status?.isExecuting).toBe(false);
      },
      { timeout: 3000 },
    );

    expect(result.current.status?.result?.responseText).toBe("Test response");

    await new Promise((resolve) => setTimeout(resolve, 3000));

    expect(apiClient.getExecutionStatus).toHaveBeenCalledTimes(callCount);
  }, 10000);

  it("should handle API errors gracefully", async () => {
    const mockError = new Error("API error");

    vi.mocked(apiClient.getExecutionStatus).mockRejectedValue(mockError);

    const { result } = renderHook(() => useExecutionStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe("API error");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.status).toBeNull();
  });

  it("should NOT poll when no execution found on mount", async () => {
    const mockResponse: ExecutionStatusResponse = {
      isExecuting: false,
      execution: null,
    };

    vi.mocked(apiClient.getExecutionStatus).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useExecutionStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status?.isExecuting).toBe(false);
    expect(apiClient.getExecutionStatus).toHaveBeenCalledTimes(1);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    expect(apiClient.getExecutionStatus).toHaveBeenCalledTimes(1);
  });

  it("should ONLY poll when execution found on mount (page refresh scenario)", async () => {
    const mockInProgressResponse: ExecutionStatusResponse = {
      isExecuting: true,
      execution: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        promptText: "Test prompt from refresh",
        executionTimestamp: "2025-11-04T10:37:00.000Z",
        status: "in_progress",
        targetModel: "gpt-4o-mini",
      },
    };

    vi.mocked(apiClient.getExecutionStatus).mockResolvedValue(
      mockInProgressResponse,
    );

    const { result } = renderHook(() => useExecutionStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.status?.isExecuting).toBe(true);
    });

    const initialCallCount = vi.mocked(apiClient.getExecutionStatus).mock.calls
      .length;

    await waitFor(
      () => {
        expect(apiClient.getExecutionStatus).toHaveBeenCalledTimes(
          initialCallCount + 1,
        );
      },
      { timeout: 3000 },
    );

    expect(result.current.status?.execution?.promptText).toBe(
      "Test prompt from refresh",
    );
  });
});

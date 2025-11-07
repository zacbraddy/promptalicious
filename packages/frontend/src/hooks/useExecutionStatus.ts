import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ExecutionStatusResponse } from "@promptalicious/shared-infra";

import { getExecutionStatus } from "@/services/apiClient";

const EXECUTION_STATUS_QUERY_KEY = ["execution", "status"] as const;
const POLL_INTERVAL_MS = 2000;

export function useExecutionStatus() {
  const foundExecutionOnMount = useRef<boolean | null>(null);

  const query = useQuery<ExecutionStatusResponse>({
    queryKey: EXECUTION_STATUS_QUERY_KEY,
    queryFn: async () => {
      const response = await getExecutionStatus();

      if (foundExecutionOnMount.current === null) {
        foundExecutionOnMount.current = response.isExecuting;
      }

      return response;
    },
    refetchInterval: (query) => {
      const data = query.state.data;

      if (foundExecutionOnMount.current === false) {
        return false;
      }

      return data?.isExecuting ? POLL_INTERVAL_MS : false;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  return {
    status: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

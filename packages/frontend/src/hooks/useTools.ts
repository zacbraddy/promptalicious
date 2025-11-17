import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ToolDefinition } from "@promptalicious/shared-infra";

import { getTools, getTool, updateTool } from "@/services/apiClient";

const TOOLS_QUERY_KEY = ["tools"] as const;
const toolQueryKey = (toolId: string) => [...TOOLS_QUERY_KEY, toolId] as const;

export function useGetTools() {
  return useQuery<ToolDefinition[]>({
    queryKey: TOOLS_QUERY_KEY,
    queryFn: getTools,
  });
}

export function useGetTool(toolId: string) {
  return useQuery<ToolDefinition>({
    queryKey: toolQueryKey(toolId),
    queryFn: () => getTool(toolId),
    enabled: !!toolId,
  });
}

export function useUpdateTool() {
  const queryClient = useQueryClient();

  return useMutation<
    ToolDefinition,
    Error,
    {
      toolId: string;
      data: Partial<Pick<ToolDefinition, "description" | "enabled">>;
    }
  >({
    mutationFn: ({ toolId, data }) => updateTool(toolId, data),
    onSuccess: (updatedTool) => {
      void queryClient.invalidateQueries({
        queryKey: TOOLS_QUERY_KEY,
      });
      void queryClient.invalidateQueries({
        queryKey: toolQueryKey(updatedTool.id),
      });
    },
  });
}

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

interface UpdateToolContext {
  previousTools?: ToolDefinition[];
  previousTool?: ToolDefinition;
}

export function useUpdateTool() {
  const queryClient = useQueryClient();

  return useMutation<
    ToolDefinition,
    Error,
    {
      toolId: string;
      data: Partial<Pick<ToolDefinition, "description" | "enabled">>;
    },
    UpdateToolContext
  >({
    mutationFn: ({ toolId, data }) => updateTool(toolId, data),
    onMutate: async ({ toolId, data }) => {
      await queryClient.cancelQueries({ queryKey: TOOLS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: toolQueryKey(toolId) });

      const previousTools =
        queryClient.getQueryData<ToolDefinition[]>(TOOLS_QUERY_KEY);
      const previousTool = queryClient.getQueryData<ToolDefinition>(
        toolQueryKey(toolId),
      );

      if (previousTools) {
        queryClient.setQueryData<ToolDefinition[]>(
          TOOLS_QUERY_KEY,
          previousTools.map((tool) =>
            tool.id === toolId ? { ...tool, ...data } : tool,
          ),
        );
      }

      if (previousTool) {
        queryClient.setQueryData<ToolDefinition>(toolQueryKey(toolId), {
          ...previousTool,
          ...data,
        });
      }

      return { previousTools, previousTool };
    },
    onError: (_error, variables, context) => {
      if (context?.previousTools) {
        queryClient.setQueryData(TOOLS_QUERY_KEY, context.previousTools);
      }
      if (context?.previousTool) {
        queryClient.setQueryData(
          toolQueryKey(variables.toolId),
          context.previousTool,
        );
      }
    },
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

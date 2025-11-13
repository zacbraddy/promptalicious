import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ProjectConfiguration,
  UpdateProjectConfigurationRequest,
  UpdateProjectConfigurationSuccessResponse,
  DiscoveryStatus,
} from "@promptalicious/shared-infra";

import {
  getProjectConfiguration,
  updateProjectConfiguration,
  getDiscoveryStatus,
  cancelDiscovery,
} from "@/services/apiClient";

const PROJECT_CONFIG_QUERY_KEY = ["project", "configuration"] as const;
const DISCOVERY_STATUS_QUERY_KEY = ["project", "discovery", "status"] as const;
const POLL_INTERVAL_MS = 500;

export function useGetProjectConfiguration() {
  return useQuery<ProjectConfiguration>({
    queryKey: PROJECT_CONFIG_QUERY_KEY,
    queryFn: getProjectConfiguration,
  });
}

export function useUpdateProjectConfiguration() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateProjectConfigurationSuccessResponse,
    Error,
    UpdateProjectConfigurationRequest
  >({
    mutationFn: updateProjectConfiguration,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: PROJECT_CONFIG_QUERY_KEY,
      });
    },
  });
}

export function useGetDiscoveryStatus() {
  const query = useQuery<DiscoveryStatus>({
    queryKey: DISCOVERY_STATUS_QUERY_KEY,
    queryFn: getDiscoveryStatus,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.isDiscovering ? POLL_INTERVAL_MS : false;
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

export function useCancelDiscovery() {
  const queryClient = useQueryClient();

  return useMutation<{ cancelled: boolean; message: string }, Error, void>({
    mutationFn: cancelDiscovery,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: DISCOVERY_STATUS_QUERY_KEY,
      });
    },
  });
}

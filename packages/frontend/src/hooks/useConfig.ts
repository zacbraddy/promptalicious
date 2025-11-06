import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConfigurationResponse,
  UpdateConfigurationRequest,
  UpdateConfigurationSuccessResponse,
  TestConnectionResponse,
} from "@promptalicious/shared-infra";

import { getConfig, updateConfig, testConnection } from "@/services/apiClient";

const CONFIG_QUERY_KEY = ["config"] as const;

export function useGetConfig() {
  return useQuery<ConfigurationResponse>({
    queryKey: CONFIG_QUERY_KEY,
    queryFn: getConfig,
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateConfigurationSuccessResponse,
    Error,
    UpdateConfigurationRequest
  >({
    mutationFn: updateConfig,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONFIG_QUERY_KEY });
    },
  });
}

export function useTestConnection() {
  return useMutation<TestConnectionResponse, Error, void>({
    mutationFn: testConnection,
  });
}

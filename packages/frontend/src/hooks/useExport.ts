import { useMutation } from "@tanstack/react-query";
import type {
  ExportRequest,
  ExportResponse,
} from "@promptalicious/shared-infra";

import { generateExport } from "@/services/apiClient";

export function useGenerateExport() {
  return useMutation<ExportResponse, Error, ExportRequest>({
    mutationFn: generateExport,
  });
}

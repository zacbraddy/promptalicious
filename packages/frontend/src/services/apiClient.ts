import axios, { type AxiosError } from "axios";
import type {
  ConfigurationResponse,
  UpdateConfigurationRequest,
  UpdateConfigurationSuccessResponse,
  UpdateConfigurationErrorResponse,
  TestConnectionResponse,
} from "@promptalicious/shared-infra";

import { config } from "@/config/env";

export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

export class ApiError extends Error {
  statusCode: number;
  response?: unknown;

  constructor(message: string, statusCode: number, response?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.response = response;
  }
}

function handleAxiosError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<
      UpdateConfigurationErrorResponse | { error?: { errorMessage?: string } }
    >;
    const errorData = axiosError.response?.data;
    const statusCode = axiosError.response?.status || 500;

    let errorMessage = `HTTP ${statusCode}: ${axiosError.message}`;
    if (errorData && "error" in errorData && errorData.error?.errorMessage) {
      errorMessage = errorData.error.errorMessage;
    }

    throw new ApiError(errorMessage, statusCode, errorData);
  }

  throw error;
}

export async function getConfig(): Promise<ConfigurationResponse> {
  try {
    const response = await apiClient.get<ConfigurationResponse>("/config");
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function updateConfig(
  data: UpdateConfigurationRequest,
): Promise<UpdateConfigurationSuccessResponse> {
  try {
    const response = await apiClient.put<UpdateConfigurationSuccessResponse>(
      "/config",
      data,
    );
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function testConnection(): Promise<TestConnectionResponse> {
  try {
    const response = await apiClient.post<TestConnectionResponse>(
      "/config/test-connection",
    );
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

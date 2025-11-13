import axios, { type AxiosError } from "axios";
import type {
  ConfigurationResponse,
  UpdateConfigurationRequest,
  UpdateConfigurationSuccessResponse,
  UpdateConfigurationErrorResponse,
  TestConnectionResponse,
  ExecutePromptRequest,
  ExecutePromptSuccessResponse,
  ExecutePromptErrorResponse,
  ExecutionStatusResponse,
  AbortExecutionResponse,
  PricingInfoResponse,
  ProjectConfiguration,
  UpdateProjectConfigurationRequest,
  UpdateProjectConfigurationSuccessResponse,
  DiscoveryStatus,
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

export async function testConnection(data?: {
  selectedModel?: string;
  apiKey?: string;
  baseURL?: string;
}): Promise<TestConnectionResponse> {
  try {
    const response = await apiClient.post<TestConnectionResponse>(
      "/config/test-connection",
      data || {},
    );
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function executePrompt(
  data: ExecutePromptRequest,
): Promise<ExecutePromptSuccessResponse> {
  try {
    const response = await apiClient.post<ExecutePromptSuccessResponse>(
      "/execute",
      data,
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ExecutePromptErrorResponse>;
      const errorData = axiosError.response?.data;
      const statusCode = axiosError.response?.status || 500;

      if (errorData && "error" in errorData) {
        throw new ApiError(errorData.error.errorMessage, statusCode, errorData);
      }

      throw new ApiError(
        `HTTP ${statusCode}: ${axiosError.message}`,
        statusCode,
      );
    }

    throw error;
  }
}

export async function getExecutionStatus(): Promise<ExecutionStatusResponse> {
  try {
    const response =
      await apiClient.get<ExecutionStatusResponse>("/execute/status");
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function abortExecution(): Promise<AbortExecutionResponse> {
  try {
    const response =
      await apiClient.post<AbortExecutionResponse>("/execute/abort");
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function getPricing(): Promise<PricingInfoResponse> {
  try {
    const response = await apiClient.get<PricingInfoResponse>("/pricing");
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function getProjectConfiguration(): Promise<ProjectConfiguration> {
  try {
    const response = await apiClient.get<ProjectConfiguration>("/project");
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function updateProjectConfiguration(
  data: UpdateProjectConfigurationRequest,
): Promise<UpdateProjectConfigurationSuccessResponse> {
  try {
    const response =
      await apiClient.put<UpdateProjectConfigurationSuccessResponse>(
        "/project",
        data,
      );
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function getDiscoveryStatus(): Promise<DiscoveryStatus> {
  try {
    const response = await apiClient.get<DiscoveryStatus>(
      "/project/discovery/status",
    );
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function cancelDiscovery(): Promise<{
  cancelled: boolean;
  message: string;
}> {
  try {
    const response = await apiClient.post<{
      cancelled: boolean;
      message: string;
    }>("/project/discovery/cancel");
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

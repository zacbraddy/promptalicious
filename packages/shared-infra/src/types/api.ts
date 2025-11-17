import type { ToolInvocationResult } from "./tools.js";

export type ExecutionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";

export type ErrorType =
  | "authentication"
  | "network"
  | "api_error"
  | "timeout"
  | "rate_limit"
  | "validation"
  | "aborted"
  | "unknown";

export interface PromptExecution {
  id: string;
  promptText: string;
  executionTimestamp: string;
  status: ExecutionStatus;
  targetModel: string;
}

export interface ExecutionResult {
  id: string;
  promptExecutionId: string;
  responseText: string;
  inputTokenCount: number;
  outputTokenCount: number;
  totalTokenCount: number;
  executionDurationMs: number;
  estimatedCostGBP: number;
  toolInvocations?: ToolInvocationResult[];
  finishReason?: string;
  reasoning?: string;
}

export interface ExecutionError {
  id: string;
  promptExecutionId: string;
  errorType: ErrorType;
  errorCode?: string;
  errorMessage: string;
  stackTrace?: string;
  additionalContext?: Record<string, unknown>;
  timestamp: string;
}

export interface LLMConfiguration {
  id: 1;
  selectedModel: string;
  apiKey?: string;
  baseURL?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingInformation {
  id: number;
  model: string;
  provider: string;
  inputTokenPriceUSD: number;
  outputTokenPriceUSD: number;
  lastUpdated: string;
}

export interface ExchangeRate {
  id: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  lastUpdated: string;
}

export enum ToolChoice {
  Auto = "auto",
  Required = "required",
  None = "none",
}

export interface AdvancedOptions {
  toolChoice?: ToolChoice | string;
  maxToolRoundtrips?: number;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  maxRetries?: number;
}

export interface ExecutePromptRequest {
  promptText: string;
  advancedOptions?: AdvancedOptions;
}

export interface ExecutePromptSuccessResponse {
  execution: PromptExecution;
  result: ExecutionResult;
}

export interface ExecutePromptErrorResponse {
  execution: PromptExecution;
  error: ExecutionError;
}

export interface ConfigurationResponse {
  config: Omit<LLMConfiguration, "apiKey">;
  availableModels: string[];
}

export interface UpdateConfigurationRequest {
  selectedModel?: string;
  apiKey?: string;
  baseURL?: string;
}

export interface UpdateConfigurationSuccessResponse {
  config: Omit<LLMConfiguration, "apiKey">;
  validationResult: {
    success: true;
    message: string;
  };
}

export interface UpdateConfigurationErrorResponse {
  error: {
    errorType: "authentication" | "validation";
    errorMessage: string;
    additionalContext?: Record<string, unknown>;
  };
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  error?: {
    errorType: string;
    errorCode?: string;
    additionalContext?: Record<string, unknown>;
  };
}

export interface PricingInfoResponse {
  pricing: PricingInformation;
  exchangeRate: ExchangeRate;
  staleness: {
    isStale: boolean;
    daysSinceUpdate: number;
  };
}

export interface ExecutionStatusResponse {
  isExecuting: boolean;
  execution: PromptExecution | null;
  result?: ExecutionResult;
  error?: ExecutionError;
}

export interface AbortExecutionResponse {
  success: boolean;
  message: string;
  error?: {
    errorType: string;
    errorMessage: string;
  };
}

export interface ProjectConfiguration {
  id: number;
  name: string;
  targetProjectPath: string;
  workspacePath: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProjectConfigurationRequest {
  name: string;
  targetProjectPath: string;
}

export interface UpdateProjectConfigurationSuccessResponse {
  config: ProjectConfiguration;
  discoveryStarted: boolean;
}

export interface UpdateProjectConfigurationErrorResponse {
  error: {
    errorType: "validation" | "filesystem" | "unknown";
    errorMessage: string;
    additionalContext?: Record<string, unknown>;
  };
}

export type DiscoveryPhase =
  | "idle"
  | "scanning"
  | "analyzing"
  | "generating"
  | "complete"
  | "error";

export type DiscoveryLogLevel = "info" | "warning" | "error";

export interface DiscoveryProgress {
  filesScanned: number;
  filesAnalyzed: number;
  toolsFound: number;
  filesGenerated: number;
}

export interface DiscoveryLogEntry {
  timestamp: string;
  level: DiscoveryLogLevel;
  phase: Exclude<DiscoveryPhase, "idle" | "error">;
  message: string;
  context?: {
    filePath?: string;
    toolName?: string;
    reason?: string;
    linesExtracted?: number;
    detectedParams?: string[];
  };
}

export interface DiscoverySummary {
  filesScanned: number;
  filesWithToolImports: number;
  toolsDiscovered: number;
  filesGenerated: number;
  skippedFiles: Array<{
    path: string;
    reason: string;
  }>;
}

export interface DiscoveryStatus {
  isDiscovering: boolean;
  phase: DiscoveryPhase;
  progress?: DiscoveryProgress;
  logs: DiscoveryLogEntry[];
  result?: {
    discoveredToolsCount: number;
    summary: DiscoverySummary;
    error?: string | null;
  };
}

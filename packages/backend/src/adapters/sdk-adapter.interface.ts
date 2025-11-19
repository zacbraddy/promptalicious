import type { AdvancedOptions } from "@promptalicious/shared-infra";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  inputSchema: unknown;
  executeFunction: (params: unknown) => Promise<unknown>;
  sourceFilePath: string;
  detectedHookParams: string[];
}

export interface DebugMessage {
  timestamp: Date;
  message: string;
  variables?: Record<string, unknown>;
}

export interface ToolInvocationResult {
  toolId: string;
  toolName: string;
  timestamp: Date;
  inputParams: unknown;
  output: unknown;
  executionDurationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  success: boolean;
  errorType: string | null;
  errorMessage: string | null;
  errorStack: string | null;
  llmReasoning: string | null;
  debugOutput: DebugMessage[];
}

export interface SDKOptions extends AdvancedOptions {
  toolChoice?: string;
  maxToolRoundtrips?: number;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  maxRetries?: number;
}

export interface ExecutionParams {
  prompt: string;
  tools: ToolDefinition[];
  options: SDKOptions;
}

export interface ExecutionResultWithTools {
  responseText: string;
  inputTokenCount: number;
  outputTokenCount: number;
  totalTokenCount: number;
  executionDurationMs: number;
  toolInvocations?: ToolInvocationResult[];
}

export interface SDKAdapter {
  name: string;

  discoverTools(projectPath: string): Promise<ToolDefinition[]>;

  executeWithTools(params: ExecutionParams): Promise<ExecutionResultWithTools>;

  validateOptions(options: unknown): SDKOptions;

  getDefaultOptions(): SDKOptions;
}

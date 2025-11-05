export interface LLMExecutionResult {
  responseText: string;
  inputTokenCount: number;
  outputTokenCount: number;
  totalTokenCount: number;
  executionDurationMs: number;
}

export function executePrompt(
  _promptText: string,
  _apiKey: string,
  _model: string,
): Promise<LLMExecutionResult> {
  throw new Error("Not implemented yet - T025");
}

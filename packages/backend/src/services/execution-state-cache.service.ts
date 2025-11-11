import type {
  ExecutionResult,
  ExecutionError,
  ExecutionStatus,
} from "@promptalicious/shared-infra";

export interface ExecutionState {
  executionId: string;
  promptText: string;
  targetModel: string;
  startTimestamp: Date;
  abortController: AbortController;
  status: ExecutionStatus;
}

export interface CompletedExecutionState extends ExecutionState {
  result?: ExecutionResult;
  error?: ExecutionError;
}

class ExecutionStateCacheService {
  private currentExecution: CompletedExecutionState | null = null;

  setCurrentExecution(
    executionId: string,
    promptText: string,
    targetModel: string,
    abortController: AbortController,
  ): void {
    this.currentExecution = {
      executionId,
      promptText,
      targetModel,
      startTimestamp: new Date(),
      abortController,
      status: "in_progress",
    };
  }

  setExecutionResult(result: ExecutionResult | ExecutionError): void {
    if (!this.currentExecution) {
      throw new Error("Cannot set execution result: no execution in progress");
    }

    if ("responseText" in result) {
      this.currentExecution.result = result;
      this.currentExecution.status = "completed";
    } else {
      this.currentExecution.error = result;
      this.currentExecution.status = "failed";
    }
  }

  getCurrentExecution(): CompletedExecutionState | null {
    return this.currentExecution;
  }

  clearCache(): void {
    this.currentExecution = null;
  }

  abortCurrentExecution(): boolean {
    if (
      !this.currentExecution ||
      this.currentExecution.status !== "in_progress"
    ) {
      return false;
    }

    this.currentExecution.abortController.abort();
    return true;
  }
}

export const executionStateCacheService = new ExecutionStateCacheService();

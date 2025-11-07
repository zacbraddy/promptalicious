import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type {
  ExecutePromptRequest,
  ExecutePromptSuccessResponse,
} from "@promptalicious/shared-infra";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PromptInput } from "@/components/PromptInput";
import { ExecuteControls } from "@/components/ExecuteControls";
import { ResponseDisplay } from "@/components/ResponseDisplay";
import { DiagnosticsDisplay } from "@/components/DiagnosticsDisplay";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { executePrompt } from "@/services/apiClient";

export function ExecutePromptPage() {
  const [promptText, setPromptText] = useState("");

  const executePromptMutation = useMutation<
    ExecutePromptSuccessResponse,
    Error,
    ExecutePromptRequest
  >({
    mutationFn: executePrompt,
  });

  const handleExecute = () => {
    if (!promptText.trim()) return;
    executePromptMutation.mutate({ promptText });
  };

  const handleCancel = () => {
    executePromptMutation.reset();
  };

  const result = executePromptMutation.data?.result;
  const error = executePromptMutation.error;

  return (
    <div className="space-y-12 py-8">
      {/* Header Section */}
      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Execute Prompt</h1>
        <p className="text-muted-foreground text-lg">
          Enter a system prompt, execute it against your configured LLM, and
          view comprehensive diagnostic information
        </p>
      </header>

      {/* Prompt Input Section */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>System Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PromptInput
              value={promptText}
              onChange={setPromptText}
              disabled={executePromptMutation.isPending}
              placeholder="Enter your system prompt here..."
            />
            <ExecuteControls
              onExecute={handleExecute}
              onCancel={handleCancel}
              isExecuting={executePromptMutation.isPending}
              isPromptEmpty={!promptText.trim()}
            />
          </CardContent>
        </Card>
      </section>

      {/* Results Section */}
      {result && (
        <div className="space-y-12">
          {/* Styled Divider */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="border-primary/50 w-full border-t-2" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background text-primary px-6 text-xs font-semibold uppercase tracking-wider">
                Results
              </span>
            </div>
          </div>

          {/* Response Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Response
              <span className="text-muted-foreground ml-3 text-sm font-normal">
                — Complete response from the model
              </span>
            </h2>
            <ResponseDisplay result={result} />
          </section>

          {/* Diagnostics Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Diagnostics
              <span className="text-muted-foreground ml-3 text-sm font-normal">
                — Token usage, timing, and cost metrics
              </span>
            </h2>
            <DiagnosticsDisplay result={result} />
          </section>
        </div>
      )}

      {/* Error Section */}
      {error && (
        <div className="space-y-12">
          {/* Styled Error Divider */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="border-destructive/50 w-full border-t-2" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background text-destructive px-6 text-xs font-semibold uppercase tracking-wider">
                Error
              </span>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-destructive text-2xl font-semibold tracking-tight">
              Execution Failed
              <span className="text-muted-foreground ml-3 text-sm font-normal">
                — Error details and guidance
              </span>
            </h2>
            <ErrorDisplay
              error={{
                id: crypto.randomUUID(),
                promptExecutionId: "",
                errorType: "unknown",
                errorMessage: error.message,
                timestamp: new Date().toISOString(),
              }}
            />
          </section>
        </div>
      )}
    </div>
  );
}

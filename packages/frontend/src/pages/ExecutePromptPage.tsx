import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  ExecutePromptRequest,
  ExecutePromptSuccessResponse,
  AdvancedOptions as AdvancedOptionsType,
} from "@promptalicious/shared-infra";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PromptInput } from "@/components/PromptInput";
import { ExecuteControls } from "@/components/ExecuteControls";
import { ResponseDisplay } from "@/components/ResponseDisplay";
import { DiagnosticsDisplay } from "@/components/DiagnosticsDisplay";
import { ToolInvocationsDisplay } from "@/components/ToolInvocationsDisplay";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { PricingInfo } from "@/components/PricingInfo";
import { AdvancedOptions } from "@/components/AdvancedOptions";
import {
  executePrompt,
  abortExecution,
  getPricing,
} from "@/services/apiClient";
import { useExecutionStatus } from "@/hooks/useExecutionStatus";

export function ExecutePromptPage() {
  const { status: executionStatus } = useExecutionStatus();
  const [localPromptText, setLocalPromptText] = useState("");
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptionsType>(
    {},
  );

  const executePromptMutation = useMutation<
    ExecutePromptSuccessResponse,
    Error,
    ExecutePromptRequest
  >({
    mutationFn: executePrompt,
  });

  const abortExecutionMutation = useMutation({
    mutationFn: abortExecution,
  });

  const pricingQuery = useQuery({
    queryKey: ["pricing"],
    queryFn: getPricing,
    staleTime: 1000 * 60 * 60,
  });

  const promptText =
    localPromptText || executionStatus?.execution?.promptText || "";

  const handleExecute = () => {
    if (!promptText.trim()) return;
    executePromptMutation.reset();
    executePromptMutation.mutate({
      promptText,
      advancedOptions: Object.keys(advancedOptions).length
        ? advancedOptions
        : undefined,
    });
  };

  const handleCancel = () => {
    abortExecutionMutation.mutate();
  };

  const isExecuting =
    executePromptMutation.isPending || executionStatus?.isExecuting || false;

  const result = executePromptMutation.data?.result || executionStatus?.result;

  const error =
    !isExecuting &&
    (executePromptMutation.error
      ? {
          id: crypto.randomUUID(),
          promptExecutionId: "",
          errorType: "unknown" as const,
          errorMessage: executePromptMutation.error.message,
          timestamp: new Date().toISOString(),
        }
      : !result && executionStatus?.error
        ? executionStatus.error
        : null);

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
              onChange={setLocalPromptText}
              disabled={isExecuting}
              placeholder="Enter your system prompt here..."
            />
            <AdvancedOptions
              options={advancedOptions}
              onChange={setAdvancedOptions}
              disabled={isExecuting}
            />
            <ExecuteControls
              onExecute={handleExecute}
              onCancel={handleCancel}
              isExecuting={isExecuting}
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

          {/* Tool Invocations Section */}
          {result.toolInvocations && result.toolInvocations.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">
                Tool Invocations
                <span className="text-muted-foreground ml-3 text-sm font-normal">
                  — Detailed diagnostics for each tool execution
                </span>
              </h2>
              <ToolInvocationsDisplay
                toolInvocations={result.toolInvocations}
              />
            </section>
          )}

          {/* Pricing Section */}
          {pricingQuery.data && (
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">
                Pricing Information{" "}
                {pricingQuery.data.staleness.isStale && (
                  <Badge variant="destructive" className="ml-2">
                    {pricingQuery.data.staleness.daysSinceUpdate} days old
                  </Badge>
                )}
                <span className="text-muted-foreground ml-3 text-sm font-normal">
                  — Current token pricing and exchange rates
                </span>
              </h2>
              <PricingInfo pricingData={pricingQuery.data} />
            </section>
          )}
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
            <ErrorDisplay error={error} />
          </section>
        </div>
      )}
    </div>
  );
}

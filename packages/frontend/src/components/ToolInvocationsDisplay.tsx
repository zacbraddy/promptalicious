import { useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Coins,
  AlertTriangle,
} from "lucide-react";
import type { ToolInvocationResult } from "@promptalicious/shared-infra";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ToolInvocationsDisplayProps {
  toolInvocations: ToolInvocationResult[];
}

export function ToolInvocationsDisplay({
  toolInvocations,
}: ToolInvocationsDisplayProps) {
  const sortedInvocations = useMemo(
    () =>
      [...toolInvocations].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
    [toolInvocations],
  );

  if (toolInvocations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tool Invocations</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {sortedInvocations.map((invocation, index) => (
            <>
              <hr />
              <AccordionItem key={index} value={`invocation-${index}`}>
                <AccordionTrigger>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      {invocation.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                      <span className="font-semibold">
                        {invocation.toolName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(invocation.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {invocation.success && (
                      <Badge variant="secondary" className="ml-auto mr-8">
                        {invocation.executionDurationMs.toLocaleString()} ms
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6">
                    {invocation.llmReasoning && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          LLM Reasoning
                        </label>
                        <div className="rounded-md border bg-muted/30 p-4 text-sm">
                          {invocation.llmReasoning}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Input Parameters
                      </label>
                      <div className="rounded-md border bg-muted/30">
                        <pre className="p-4 text-xs overflow-x-auto">
                          <code>
                            {JSON.stringify(invocation.inputParams, null, 2)}
                          </code>
                        </pre>
                      </div>
                    </div>

                    {invocation.success && invocation.output !== undefined && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Output</label>
                        <div className="rounded-md border bg-muted/30">
                          <pre className="p-4 text-xs overflow-x-auto">
                            <code>
                              {typeof invocation.output === "string"
                                ? invocation.output
                                : JSON.stringify(invocation.output, null, 2)}
                            </code>
                          </pre>
                        </div>
                      </div>
                    )}

                    {!invocation.success && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-destructive flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Error Details
                        </label>
                        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 space-y-3">
                          {invocation.errorType && (
                            <div>
                              <span className="text-xs font-semibold text-destructive">
                                Type:
                              </span>{" "}
                              <span className="text-sm font-mono">
                                {invocation.errorType}
                              </span>
                            </div>
                          )}
                          {invocation.errorMessage && (
                            <div>
                              <span className="text-xs font-semibold text-destructive">
                                Message:
                              </span>{" "}
                              <p className="text-sm mt-1">
                                {invocation.errorMessage}
                              </p>
                            </div>
                          )}
                          {invocation.errorStack && (
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-destructive">
                                Stack Trace:
                              </span>
                              <div className="rounded-md bg-destructive/5 border border-destructive/20">
                                <pre className="p-3 text-xs overflow-x-auto">
                                  <code className="text-destructive/80">
                                    {invocation.errorStack}
                                  </code>
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Execution Time
                        </div>
                        <div className="font-mono text-sm">
                          {invocation.executionDurationMs.toLocaleString()} ms
                        </div>
                      </div>
                      {invocation.inputTokens !== null && (
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Coins className="h-3 w-3" />
                            Input Tokens
                          </div>
                          <div className="font-mono text-sm">
                            {invocation.inputTokens.toLocaleString()}
                          </div>
                        </div>
                      )}
                      {invocation.outputTokens !== null && (
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Coins className="h-3 w-3" />
                            Output Tokens
                          </div>
                          <div className="font-mono text-sm">
                            {invocation.outputTokens.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>

                    {invocation.debugOutput &&
                      invocation.debugOutput.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Debug Output
                          </label>
                          <div className="rounded-md border bg-muted/30 p-4 space-y-3">
                            {invocation.debugOutput.map((debug, debugIndex) => (
                              <div
                                key={debugIndex}
                                className="border-l-2 border-primary/30 pl-3 space-y-1"
                              >
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {new Date(
                                      debug.timestamp,
                                    ).toLocaleTimeString("en-GB", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                      fractionalSecondDigits: 3,
                                    })}
                                  </span>
                                  <span className="text-sm font-medium">
                                    {debug.message}
                                  </span>
                                </div>
                                {debug.variables &&
                                  Object.keys(debug.variables).length > 0 && (
                                    <div className="rounded-md bg-muted/50 mt-2">
                                      <pre className="p-2 text-xs overflow-x-auto">
                                        <code>
                                          {JSON.stringify(
                                            debug.variables,
                                            null,
                                            2,
                                          )}
                                        </code>
                                      </pre>
                                    </div>
                                  )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </>
          ))}
          <hr />
        </Accordion>
      </CardContent>
    </Card>
  );
}

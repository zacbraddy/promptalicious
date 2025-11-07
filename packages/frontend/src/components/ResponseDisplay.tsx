import type { ExecutionResult } from "@promptalicious/shared-infra";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ResponseDisplayProps {
  result: ExecutionResult;
}

export function ResponseDisplay({ result }: ResponseDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM Response</CardTitle>
        <CardDescription>Complete response from the model</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[600px] overflow-y-auto rounded-md border bg-muted/30 p-4">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
            {result.responseText}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

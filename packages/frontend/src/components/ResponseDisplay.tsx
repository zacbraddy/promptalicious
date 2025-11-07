import type { ExecutionResult } from "@promptalicious/shared-infra";

import { Card, CardContent } from "@/components/ui/card";

interface ResponseDisplayProps {
  result: ExecutionResult;
}

export function ResponseDisplay({ result }: ResponseDisplayProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="max-h-[600px] overflow-y-auto rounded-md border bg-muted/30 p-4">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
            {result.responseText}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

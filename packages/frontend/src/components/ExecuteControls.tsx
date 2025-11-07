import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ExecuteControlsProps {
  onExecute: () => void;
  onCancel: () => void;
  isExecuting: boolean;
  isPromptEmpty: boolean;
}

export function ExecuteControls({
  onExecute,
  onCancel,
  isExecuting,
  isPromptEmpty,
}: ExecuteControlsProps) {
  return (
    <div className="flex gap-3">
      <Button
        onClick={onExecute}
        disabled={isPromptEmpty || isExecuting}
        className="min-w-32"
      >
        {isExecuting && <Loader2 className="animate-spin" />}
        Execute
      </Button>

      <Button
        onClick={onCancel}
        disabled={!isExecuting}
        variant="outline"
        className="min-w-32"
      >
        Cancel
      </Button>
    </div>
  );
}

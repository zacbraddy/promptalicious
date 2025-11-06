import * as React from "react";
import { MAX_PROMPT_LENGTH } from "@promptalicious/shared-infra";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PromptInput({
  value,
  onChange,
  placeholder = "Enter your system prompt here...",
  className,
  disabled = false,
}: PromptInputProps) {
  const characterCount = value.length;
  const isNearLimit = characterCount > MAX_PROMPT_LENGTH * 0.9;
  const isOverLimit = characterCount > MAX_PROMPT_LENGTH;

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    if (newValue.length <= MAX_PROMPT_LENGTH) {
      onChange(newValue);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-32 resize-y"
        aria-label="System prompt input"
        aria-describedby="character-count"
      />
      <div
        id="character-count"
        className={cn(
          "text-sm text-right transition-colors",
          isOverLimit
            ? "text-destructive font-medium"
            : isNearLimit
              ? "text-warning"
              : "text-muted-foreground",
        )}
        aria-live="polite"
      >
        {characterCount.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()}{" "}
        characters
      </div>
    </div>
  );
}

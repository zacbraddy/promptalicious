import { useEffect } from "react";
import { ToolChoice } from "@promptalicious/shared-infra";
import type { AdvancedOptions as AdvancedOptionsType } from "@promptalicious/shared-infra";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface AdvancedOptionsProps {
  options: AdvancedOptionsType;
  onChange: (options: AdvancedOptionsType) => void;
  disabled?: boolean;
}

const STORAGE_KEY = "promptalicious:advancedOptions";

const DEFAULT_OPTIONS: AdvancedOptionsType = {
  toolChoice: ToolChoice.Auto,
  maxToolRoundtrips: 10,
  temperature: 1.0,
  topP: 1.0,
  maxTokens: 4096,
  maxRetries: 2,
};

export function AdvancedOptions({
  options,
  onChange,
  disabled = false,
}: AdvancedOptionsProps) {
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AdvancedOptionsType;
        onChange({ ...DEFAULT_OPTIONS, ...parsed });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [onChange]);

  const handleChange = (key: keyof AdvancedOptionsType, value: unknown) => {
    const updated = { ...options, [key]: value };
    onChange(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <Card className="border-primary/20 bg-card/50 py-0">
      <CardContent className="p-0">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem
            value="advanced-options"
            className="overflow-hidden rounded-lg border-0 data-[state=open]:rounded-b-none"
          >
            <AccordionTrigger className="hover:bg-accent/50 px-4 py-4 text-sm font-semibold transition-colors [&>svg]:shrink-0 data-[state=open]:rounded-b-none hover:no-underline">
              <span className="flex items-baseline gap-2">
                <span>Advanced Options</span>
                <span className="text-muted-foreground text-xs font-normal">
                  — Configure LLM execution parameters
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-6 px-4 py-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="toolChoice">Tool Choice</Label>
                  <Select
                    value={options.toolChoice?.toString() ?? ToolChoice.Auto}
                    onValueChange={(value) => handleChange("toolChoice", value)}
                    disabled={disabled}
                  >
                    <SelectTrigger id="toolChoice">
                      <SelectValue placeholder="Select tool choice strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ToolChoice.Auto}>
                        Auto (LLM decides)
                      </SelectItem>
                      <SelectItem value={ToolChoice.Required}>
                        Required (must use tools)
                      </SelectItem>
                      <SelectItem value={ToolChoice.None}>
                        None (no tools)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Controls when the LLM should use tools
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxToolRoundtrips">Max Tool Roundtrips</Label>
                  <Input
                    id="maxToolRoundtrips"
                    type="number"
                    min={1}
                    max={50}
                    value={options.maxToolRoundtrips ?? 10}
                    onChange={(e) =>
                      handleChange(
                        "maxToolRoundtrips",
                        parseInt(e.target.value),
                      )
                    }
                    disabled={disabled}
                  />
                  <p className="text-muted-foreground text-xs">
                    Maximum number of tool invocation rounds
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={options.temperature ?? 1.0}
                    onChange={(e) =>
                      handleChange("temperature", parseFloat(e.target.value))
                    }
                    disabled={disabled}
                  />
                  <p className="text-muted-foreground text-xs">
                    Randomness (0-2): higher = more creative
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topP">Top P (Nucleus Sampling)</Label>
                  <Input
                    id="topP"
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={options.topP ?? 1.0}
                    onChange={(e) =>
                      handleChange("topP", parseFloat(e.target.value))
                    }
                    disabled={disabled}
                  />
                  <p className="text-muted-foreground text-xs">
                    Limits token selection to top cumulative probability mass.
                    Lower values (e.g., 0.1) = more focused, deterministic.
                    Higher values (e.g., 0.95) = more diverse, creative. Use 1.0
                    to consider all tokens.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    min={1}
                    max={100000}
                    value={options.maxTokens ?? 4096}
                    onChange={(e) =>
                      handleChange("maxTokens", parseInt(e.target.value))
                    }
                    disabled={disabled}
                  />
                  <p className="text-muted-foreground text-xs">
                    Maximum tokens in response
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxRetries">Max Retries</Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    min={0}
                    max={10}
                    value={options.maxRetries ?? 2}
                    onChange={(e) =>
                      handleChange("maxRetries", parseInt(e.target.value))
                    }
                    disabled={disabled}
                  />
                  <p className="text-muted-foreground text-xs">
                    Number of retry attempts on failure
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

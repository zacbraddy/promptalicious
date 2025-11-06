import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { LabelledInput } from "@/components/ui/labelled-input";
import { LabelledSelect } from "@/components/ui/labelled-select";
import { SelectItem } from "@/components/ui/select";

interface SettingsFormProps {
  availableModels: string[];
  initialModel?: string;
  initialApiKey?: string;
  initialProviderEndpoint?: string;
  onSubmit: (data: {
    selectedModel: string;
    apiKey: string;
    providerEndpoint?: string;
  }) => Promise<void>;
}

export function SettingsForm({
  availableModels,
  initialModel,
  initialApiKey = "",
  initialProviderEndpoint = "",
  onSubmit,
}: SettingsFormProps) {
  const [selectedModel, setSelectedModel] = useState<string>(
    initialModel || availableModels[0] || "gpt-4o-mini",
  );
  const [apiKey, setApiKey] = useState<string>(initialApiKey);
  const [providerEndpoint, setProviderEndpoint] = useState<string>(
    initialProviderEndpoint,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    void onSubmit({
      selectedModel,
      apiKey,
      providerEndpoint: providerEndpoint || undefined,
    }).finally(() => {
      setIsLoading(false);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <LabelledSelect
        label="Model"
        id="model"
        value={selectedModel}
        onValueChange={(value) => {
          if (value) setSelectedModel(value);
        }}
        disabled={isLoading}
        required
        placeholder="Select a model"
      >
        {availableModels.map((model) => (
          <SelectItem key={model} value={model}>
            {model}
          </SelectItem>
        ))}
      </LabelledSelect>

      <LabelledInput
        label="API Key"
        id="apiKey"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        disabled={isLoading}
        required
        placeholder="Enter your API key"
      />

      <LabelledInput
        label="Provider Endpoint (Optional)"
        id="providerEndpoint"
        type="url"
        value={providerEndpoint}
        onChange={(e) => setProviderEndpoint(e.target.value)}
        disabled={isLoading}
        placeholder="https://api.openai.com/v1"
      />

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Saving..." : "Save Configuration"}
      </Button>
    </form>
  );
}

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_KEY_PLACEHOLDER, SettingsForm } from "@/components/SettingsForm";
import { useGetConfig, useUpdateConfig } from "@/hooks/useConfig";

export function SettingsPage() {
  const { data, isLoading, isError } = useGetConfig();
  const updateConfigMutation = useUpdateConfig();
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  const handleSubmit = async (formData: {
    selectedModel: string;
    apiKey: string;
  }) => {
    const apiKey =
      formData.apiKey === API_KEY_PLACEHOLDER ? undefined : formData.apiKey;

    await updateConfigMutation.mutateAsync({
      selectedModel: formData.selectedModel,
      apiKey,
    });
  };

  const initialConfig = data
    ? {
        selectedModel: data.config.selectedModel,
        apiKey: API_KEY_PLACEHOLDER,
      }
    : isError
      ? {
          selectedModel: "gpt-4o-mini",
          apiKey: "",
        }
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your LLM provider settings and API credentials
        </p>
      </div>

      <div className="relative">
        <Card>
          <CardHeader>
            <CardTitle>LLM Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !initialConfig ? (
              <div className="text-muted-foreground">
                Loading configuration...
              </div>
            ) : (
              <SettingsForm
                availableModels={data?.availableModels || ["gpt-4o-mini"]}
                initialModel={initialConfig.selectedModel}
                initialApiKey={initialConfig.apiKey}
                onSubmit={handleSubmit}
                onSubmittingChange={setIsFormSubmitting}
              />
            )}
          </CardContent>
        </Card>

        {isFormSubmitting && (
          <div className="absolute inset-0 bg-black/20 rounded-xl pointer-events-none" />
        )}
      </div>
    </div>
  );
}

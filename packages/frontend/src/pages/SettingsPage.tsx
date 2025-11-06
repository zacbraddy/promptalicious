import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { API_KEY_PLACEHOLDER } from "@promptalicious/shared-infra";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/components/SettingsForm";
import {
  useGetConfig,
  useUpdateConfig,
  useTestConnection,
} from "@/hooks/useConfig";
import { ApiError } from "@/services/apiClient";

export function SettingsPage() {
  const { data, isLoading, isError } = useGetConfig();
  const updateConfigMutation = useUpdateConfig();
  const testConnectionMutation = useTestConnection();
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  const handleSubmit = async (formData: {
    selectedModel: string;
    apiKey: string;
    baseURL?: string;
  }) => {
    try {
      const apiKey =
        formData.apiKey === API_KEY_PLACEHOLDER ? undefined : formData.apiKey;

      await updateConfigMutation.mutateAsync({
        selectedModel: formData.selectedModel,
        apiKey,
        baseURL: formData.baseURL,
      });
      toast.success("Configuration saved and validated successfully");
    } catch (error) {
      let errorMessage = "Failed to save configuration";
      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    }
  };

  const handleTestConnection = async (formData: {
    selectedModel: string;
    apiKey: string;
    baseURL?: string;
  }) => {
    try {
      await testConnectionMutation.mutateAsync({
        selectedModel: formData.selectedModel,
        apiKey: formData.apiKey,
        baseURL: formData.baseURL,
      });
      toast.success("Connection test successful");
    } catch (error) {
      let errorMessage = "Failed to test connection";
      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    }
  };

  const initialConfig = data
    ? {
        selectedModel: data.config.selectedModel,
        apiKey: API_KEY_PLACEHOLDER,
        baseURL: data.config.baseURL || "",
      }
    : isError
      ? {
          selectedModel: "gpt-4o-mini",
          apiKey: "",
          baseURL: "",
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
              <div className="flex items-center justify-center gap-3 py-8 text-accent">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-lg">Loading configuration...</span>
              </div>
            ) : (
              <SettingsForm
                availableModels={data?.availableModels || ["gpt-4o-mini"]}
                initialModel={initialConfig.selectedModel}
                initialApiKey={initialConfig.apiKey}
                initialBaseURL={initialConfig.baseURL}
                onSubmit={handleSubmit}
                onTestConnection={handleTestConnection}
                isSubmitting={updateConfigMutation.isPending}
                isTestingConnection={testConnectionMutation.isPending}
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

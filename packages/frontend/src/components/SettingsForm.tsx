import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LabelledInput } from "@/components/ui/labelled-input";
import { LabelledSelect } from "@/components/ui/labelled-select";
import { SelectItem } from "@/components/ui/select";

export const API_KEY_PLACEHOLDER = "    ";

const settingsFormSchema = z.object({
  selectedModel: z.string().min(1, "Model selection is required"),
  apiKey: z
    .string()
    .min(1, "API key is required")
    .refine(
      (val) => val === API_KEY_PLACEHOLDER || val.trim().length > 0,
      "API key is required",
    ),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

interface SettingsFormProps {
  availableModels: string[];
  initialModel?: string;
  initialApiKey?: string;
  onSubmit: (data: { selectedModel: string; apiKey: string }) => Promise<void>;
  onTestConnection: () => Promise<void>;
  isSubmitting: boolean;
  isTestingConnection: boolean;
  onSubmittingChange?: (isSubmitting: boolean) => void;
}

export function SettingsForm({
  availableModels,
  initialModel,
  initialApiKey = "",
  onSubmit,
  onTestConnection,
  isSubmitting,
  isTestingConnection,
  onSubmittingChange,
}: SettingsFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      selectedModel: initialModel || availableModels[0] || "gpt-4o-mini",
      apiKey: initialApiKey,
    },
  });

  const selectedModel = watch("selectedModel");

  const onFormSubmit = async (data: SettingsFormData) => {
    onSubmittingChange?.(true);
    try {
      await onSubmit({
        selectedModel: data.selectedModel,
        apiKey: data.apiKey,
      });
    } finally {
      onSubmittingChange?.(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onFormSubmit)(e);
      }}
      className="flex flex-col gap-4"
    >
      <LabelledSelect
        label="Model"
        id="model"
        value={selectedModel}
        onValueChange={(value) => {
          if (value) setValue("selectedModel", value);
        }}
        disabled={isSubmitting || isTestingConnection}
        required
        placeholder="Select a model"
      >
        {availableModels.map((model) => (
          <SelectItem key={model} value={model}>
            {model}
          </SelectItem>
        ))}
      </LabelledSelect>
      {errors.selectedModel && (
        <p className="text-destructive text-sm">
          {errors.selectedModel.message}
        </p>
      )}

      <div>
        <LabelledInput
          label="API Key"
          id="apiKey"
          type="password"
          {...register("apiKey")}
          disabled={isSubmitting || isTestingConnection}
          required
          placeholder="Enter your API key"
        />
        {errors.apiKey && (
          <p className="text-destructive text-sm mt-1">
            {errors.apiKey.message}
          </p>
        )}
      </div>

      <div className="flex justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting || isTestingConnection}
          className="border-accent/50 text-accent hover:bg-accent/10 hover:text-accent hover:border-accent"
          onClick={() => {
            void onTestConnection();
          }}
        >
          {isTestingConnection && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isTestingConnection ? "Testing..." : "Test Connection"}
        </Button>

        <Button type="submit" disabled={isSubmitting || isTestingConnection}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </form>
  );
}

import { z } from "zod";

export const API_KEY_PLACEHOLDER = "    ";

const baseURLValidator = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val || val === "") return true;
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Must be a valid URL or empty" },
  )
  .transform((val) => (val === "" ? undefined : val));

const configFieldsSchema = z.object({
  selectedModel: z
    .enum(["gpt-4o-mini"], {
      message: "Invalid model. Available models: gpt-4o-mini",
    })
    .optional(),
  apiKey: z.string().min(1, "API key cannot be empty").optional(),
  baseURL: baseURLValidator,
});

export const settingsFormSchema = z.object({
  selectedModel: z.string().min(1, "Model selection is required"),
  apiKey: z
    .string()
    .min(1, "API key is required")
    .refine(
      (val) => val === API_KEY_PLACEHOLDER || val.trim().length > 0,
      "API key is required",
    ),
  baseURL: baseURLValidator,
});

export const testConnectionSchema = configFieldsSchema;

export const updateConfigSchema = configFieldsSchema.refine(
  (data) => data.selectedModel || data.apiKey || data.baseURL !== undefined,
  {
    message:
      "Request must include at least one field to update (selectedModel, apiKey, or baseURL)",
  },
);

export type UpdateConfigData = z.infer<typeof updateConfigSchema>;
export type SettingsFormData = z.infer<typeof settingsFormSchema>;
export type TestConnectionData = z.infer<typeof testConnectionSchema>;

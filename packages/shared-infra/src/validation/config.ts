import { z } from "zod";

export const updateConfigSchema = z
  .object({
    selectedModel: z
      .enum(["gpt-4o-mini"], {
        message: "Invalid model. Available models: gpt-4o-mini",
      })
      .optional(),
    apiKey: z.string().min(1, "API key cannot be empty").optional(),
    baseURL: z.union([z.url(), z.literal("")]).optional(),
  })
  .refine(
    (data) => data.selectedModel || data.apiKey || data.baseURL !== undefined,
    {
      message:
        "Request must include at least one field to update (selectedModel, apiKey, or baseURL)",
    },
  );

export const API_KEY_PLACEHOLDER = "    ";

export const settingsFormSchema = z.object({
  selectedModel: z.string().min(1, "Model selection is required"),
  apiKey: z
    .string()
    .min(1, "API key is required")
    .refine(
      (val) => val === API_KEY_PLACEHOLDER || val.trim().length > 0,
      "API key is required",
    ),
  baseURL: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === "" || z.string().url().safeParse(val).success,
      { message: "Must be a valid URL or empty" },
    )
    .transform((val) => (val === "" ? undefined : val)),
});

export const testConnectionSchema = z.object({
  selectedModel: z.string().optional(),
  apiKey: z.string().optional(),
  baseURL: z.union([z.url(), z.literal(""), z.undefined()]).optional(),
});

export type UpdateConfigData = z.infer<typeof updateConfigSchema>;
export type SettingsFormData = z.infer<typeof settingsFormSchema>;
export type TestConnectionData = z.infer<typeof testConnectionSchema>;

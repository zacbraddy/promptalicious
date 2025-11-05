import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type {
  ConfigurationResponse,
  UpdateConfigurationSuccessResponse,
  UpdateConfigurationErrorResponse,
  TestConnectionResponse,
} from "@promptalicious/shared-infra";

import {
  getConfig,
  updateConfig,
  testConnection,
  getApiKey,
} from "../services/configService.js";

const configRouter = new Hono();

const AVAILABLE_MODELS = ["gpt-4o-mini"];

const updateConfigSchema = z
  .object({
    selectedModel: z
      .enum(["gpt-4o-mini"], {
        message: `Invalid model. Available models: ${AVAILABLE_MODELS.join(", ")}`,
      })
      .optional(),
    apiKey: z.string().min(1, "API key cannot be empty").optional(),
    providerEndpoint: z.union([z.url(), z.literal("")]).optional(),
  })
  .refine(
    (data) =>
      data.selectedModel || data.apiKey || data.providerEndpoint !== undefined,
    {
      message:
        "Request must include at least one field to update (selectedModel, apiKey, or providerEndpoint)",
    },
  );

configRouter.get("/", async (c: Context) => {
  try {
    const config = await getConfig();

    if (!config) {
      return c.json<ConfigurationResponse>(
        {
          config: {
            id: 1,
            selectedModel: "gpt-4o-mini",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          availableModels: AVAILABLE_MODELS,
        },
        200,
      );
    }

    const response: ConfigurationResponse = {
      config: {
        id: 1,
        selectedModel: config.selectedModel,
        providerEndpoint: config.providerEndpoint ?? undefined,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      },
      availableModels: AVAILABLE_MODELS,
    };

    return c.json(response, 200);
  } catch {
    return c.json<ConfigurationResponse>(
      {
        config: {
          id: 1,
          selectedModel: "gpt-4o-mini",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        availableModels: AVAILABLE_MODELS,
      },
      200,
    );
  }
});

configRouter.put(
  "/",
  zValidator("json", updateConfigSchema, (result, c) => {
    if (!result.success) {
      const firstError = result.error.issues[0];
      return c.json<UpdateConfigurationErrorResponse>(
        {
          error: {
            errorType: "validation",
            errorMessage: firstError?.message || "Validation failed",
            additionalContext: firstError?.path
              ? { field: firstError.path.join(".") }
              : undefined,
          },
        },
        400,
      );
    }
  }),
  async (c) => {
    try {
      const body = c.req.valid("json");

      if (body.apiKey !== undefined) {
        const currentConfig = await getConfig();
        const modelToTest =
          body.selectedModel || currentConfig?.selectedModel || "gpt-4o-mini";

        const testResult = await testConnection(body.apiKey, modelToTest);

        if (!testResult.success) {
          return c.json<UpdateConfigurationErrorResponse>(
            {
              error: {
                errorType: "authentication",
                errorMessage: `API key validation failed: ${testResult.message}`,
                additionalContext: {
                  testCallFailed: true,
                  errorType: testResult.error?.errorType,
                  errorCode: testResult.error?.errorCode,
                },
              },
            },
            400,
          );
        }
      }

      const updatedConfig = await updateConfig(body);

      const response: UpdateConfigurationSuccessResponse = {
        config: {
          id: 1,
          selectedModel: updatedConfig.selectedModel,
          providerEndpoint: updatedConfig.providerEndpoint ?? undefined,
          createdAt: updatedConfig.createdAt.toISOString(),
          updatedAt: updatedConfig.updatedAt.toISOString(),
        },
        validationResult: {
          success: true,
          message: body.apiKey
            ? "API credentials validated successfully"
            : "Configuration updated successfully",
        },
      };

      return c.json(response, 200);
    } catch (error) {
      return c.json<UpdateConfigurationErrorResponse>(
        {
          error: {
            errorType: "validation",
            errorMessage:
              error instanceof Error
                ? error.message
                : "Failed to update configuration",
          },
        },
        400,
      );
    }
  },
);

configRouter.post("/test-connection", async (c: Context) => {
  try {
    const config = await getConfig();

    if (!config) {
      return c.json<TestConnectionResponse>(
        {
          success: false,
          message:
            "No configuration found. Please configure API credentials first.",
          error: {
            errorType: "validation",
          },
        },
        400,
      );
    }

    const apiKey = await getApiKey();

    if (!apiKey) {
      return c.json<TestConnectionResponse>(
        {
          success: false,
          message:
            "No API key configured. Please configure API credentials first.",
          error: {
            errorType: "authentication",
          },
        },
        400,
      );
    }

    const testResult = await testConnection(apiKey, config.selectedModel);

    if (testResult.success) {
      return c.json<TestConnectionResponse>(
        {
          success: true,
          message: testResult.message,
        },
        200,
      );
    }

    return c.json<TestConnectionResponse>(
      {
        success: false,
        message: testResult.message,
        error: testResult.error,
      },
      400,
    );
  } catch (error) {
    return c.json<TestConnectionResponse>(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to test connection",
        error: {
          errorType: "unknown",
        },
      },
      400,
    );
  }
});

export default configRouter;

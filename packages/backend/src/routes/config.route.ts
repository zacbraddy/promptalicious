import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import type {
  ConfigurationResponse,
  UpdateConfigurationSuccessResponse,
  UpdateConfigurationErrorResponse,
  TestConnectionResponse,
} from "@promptalicious/shared-infra";
import {
  updateConfigSchema,
  testConnectionSchema,
  API_KEY_PLACEHOLDER,
} from "@promptalicious/shared-infra";

import {
  getConfig,
  updateConfig,
  testConnection,
  getApiKey,
} from "../services/config.service";

const configRouter = new Hono();

const AVAILABLE_MODELS = ["gpt-4o-mini"];

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
        baseURL: config.baseURL || undefined,
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

      if (body.apiKey !== undefined || body.baseURL !== undefined) {
        const currentConfig = await getConfig();
        const apiKeyToTest = body.apiKey || (await getApiKey());

        if (!apiKeyToTest) {
          return c.json<UpdateConfigurationErrorResponse>(
            {
              error: {
                errorType: "authentication",
                errorMessage:
                  "No API key available for validation. Please provide an API key first.",
              },
            },
            400,
          );
        }

        const modelToTest =
          body.selectedModel || currentConfig?.selectedModel || "gpt-4o-mini";
        const baseURLToTest =
          body.baseURL !== undefined
            ? body.baseURL || undefined
            : currentConfig?.baseURL || undefined;

        const testResult = await testConnection(
          apiKeyToTest,
          modelToTest,
          baseURLToTest,
        );

        if (!testResult.success) {
          return c.json<UpdateConfigurationErrorResponse>(
            {
              error: {
                errorType: "authentication",
                errorMessage: `Configuration validation failed: ${testResult.message}`,
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
          baseURL: updatedConfig.baseURL || undefined,
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

configRouter.post(
  "/test-connection",
  zValidator("json", testConnectionSchema, (result, c) => {
    if (!result.success) {
      const firstError = result.error.issues[0];
      return c.json<TestConnectionResponse>(
        {
          success: false,
          message: firstError?.message || "Validation failed",
          error: {
            errorType: "validation",
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

      const apiKey =
        body.apiKey && body.apiKey !== API_KEY_PLACEHOLDER
          ? body.apiKey
          : await getApiKey();

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

      const modelToTest = body.selectedModel || config.selectedModel;
      const baseURLToTest =
        body.baseURL !== undefined
          ? body.baseURL || undefined
          : config.baseURL || undefined;

      const testResult = await testConnection(
        apiKey,
        modelToTest,
        baseURLToTest,
      );

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
            error instanceof Error
              ? error.message
              : "Failed to test connection",
          error: {
            errorType: "unknown",
          },
        },
        400,
      );
    }
  },
);

export default configRouter;

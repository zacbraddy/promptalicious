import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type {
  UpdateProjectConfigurationRequest,
  UpdateProjectConfigurationSuccessResponse,
  UpdateProjectConfigurationErrorResponse,
} from "@promptalicious/shared-infra";

import {
  getProjectConfiguration,
  updateProjectConfiguration,
  startDiscovery,
  getDiscoveryStatus,
  cancelDiscovery,
} from "@/services/project-configuration.service";

const projectConfigurationRouter = new Hono();

const updateProjectConfigSchema = z.object({
  name: z.string().min(1, { message: "name must not be empty" }),
  targetProjectPath: z
    .string()
    .min(1, { message: "targetProjectPath must not be empty" }),
});

projectConfigurationRouter.get("/", async (c: Context) => {
  try {
    const config = await getProjectConfiguration();

    if (!config) {
      return c.json(
        {
          error: {
            errorType: "not_found",
            errorMessage: "No project configured",
          },
        },
        404,
      );
    }

    return c.json(
      {
        id: config.id,
        name: config.name,
        targetProjectPath: config.targetProjectPath,
        workspacePath: config.workspacePath,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      },
      200,
    );
  } catch (error) {
    return c.json(
      {
        error: {
          errorType: "unknown",
          errorMessage:
            error instanceof Error
              ? error.message
              : "Failed to retrieve project configuration",
        },
      },
      500,
    );
  }
});

projectConfigurationRouter.put(
  "/",
  zValidator("json", updateProjectConfigSchema, (result, c) => {
    if (!result.success) {
      const firstError = result.error.issues[0];
      const fieldName = firstError?.path[0] as string | undefined;
      let errorMessage = firstError?.message || "Validation failed";

      if (
        firstError?.code === "invalid_type" &&
        firstError.message.includes("received undefined") &&
        fieldName
      ) {
        errorMessage = `${fieldName} is required`;
      } else if (fieldName && firstError?.message) {
        errorMessage = firstError.message;
      }

      return c.json<UpdateProjectConfigurationErrorResponse>(
        {
          error: {
            errorType: "validation",
            errorMessage,
            additionalContext: fieldName ? { field: fieldName } : undefined,
          },
        },
        400,
      );
    }
  }),
  async (c) => {
    try {
      const body = c.req.valid("json") as UpdateProjectConfigurationRequest;

      const config = await updateProjectConfiguration(body);

      void startDiscovery();

      const response: UpdateProjectConfigurationSuccessResponse = {
        config: {
          id: config.id,
          name: config.name,
          targetProjectPath: config.targetProjectPath,
          workspacePath: config.workspacePath,
          createdAt: config.createdAt.toISOString(),
          updatedAt: config.updatedAt.toISOString(),
        },
        discoveryStarted: true,
      };

      return c.json(response, 202);
    } catch (error) {
      return c.json<UpdateProjectConfigurationErrorResponse>(
        {
          error: {
            errorType: "validation",
            errorMessage:
              error instanceof Error
                ? error.message
                : "Failed to update project configuration",
          },
        },
        400,
      );
    }
  },
);

projectConfigurationRouter.get("/discovery/status", async (c: Context) => {
  try {
    const status = await getDiscoveryStatus();
    return c.json(status, 200);
  } catch (error) {
    return c.json(
      {
        error: {
          errorType: "unknown",
          errorMessage:
            error instanceof Error
              ? error.message
              : "Failed to retrieve discovery status",
        },
      },
      500,
    );
  }
});

projectConfigurationRouter.post("/discovery/cancel", async (c: Context) => {
  try {
    const config = await getProjectConfiguration();
    const workspacePath = config?.workspacePath || "";

    const result = await cancelDiscovery(workspacePath);

    if (!result.cancelled) {
      return c.json(
        {
          error: {
            errorType: "not_found",
            errorMessage: result.message,
          },
        },
        404,
      );
    }

    return c.json(
      {
        cancelled: result.cancelled,
        message: result.message,
      },
      200,
    );
  } catch (error) {
    return c.json(
      {
        error: {
          errorType: "unknown",
          errorMessage:
            error instanceof Error
              ? error.message
              : "Failed to cancel discovery",
        },
      },
      500,
    );
  }
});

export default projectConfigurationRouter;

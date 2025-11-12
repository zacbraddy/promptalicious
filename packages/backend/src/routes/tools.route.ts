import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { updateToolSchema } from "@promptalicious/shared-infra";

import { getTools, getTool, updateTool } from "@/services/tools.service";

const toolsRouter = new Hono();

toolsRouter.get("/", async (c: Context) => {
  try {
    const tools = await getTools();

    return c.json(
      {
        tools: tools.map((tool) => ({
          id: tool.id,
          name: tool.name,
          description: tool.description,
          sourceDescription: tool.sourceDescription,
          enabled: tool.enabled,
          createdAt: tool.createdAt.toISOString(),
          updatedAt: tool.updatedAt.toISOString(),
        })),
      },
      200,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "No project configured") {
      return c.json(
        {
          error: "not_found",
          message: "No project configured",
        },
        404,
      );
    }

    return c.json(
      {
        error: "internal_error",
        message:
          error instanceof Error ? error.message : "Failed to retrieve tools",
      },
      500,
    );
  }
});

toolsRouter.get("/:id", async (c: Context) => {
  try {
    const toolId = c.req.param("id");
    const tool = await getTool(toolId);

    if (!tool) {
      return c.json(
        {
          error: "not_found",
          message: "Tool not found",
        },
        404,
      );
    }

    return c.json(
      {
        tool: {
          id: tool.id,
          name: tool.name,
          description: tool.description,
          sourceDescription: tool.sourceDescription,
          parametersSchema: tool.parametersSchema,
          sourceFilePath: tool.sourceFilePath,
          workspaceDir: tool.workspaceDir,
          enabled: tool.enabled,
          detectedHookParams: tool.detectedHookParams || [],
          createdAt: tool.createdAt.toISOString(),
          updatedAt: tool.updatedAt.toISOString(),
        },
      },
      200,
    );
  } catch (error) {
    return c.json(
      {
        error: "internal_error",
        message:
          error instanceof Error ? error.message : "Failed to retrieve tool",
      },
      500,
    );
  }
});

toolsRouter.patch(
  "/:id",
  zValidator("json", updateToolSchema, (result, c) => {
    if (!result.success) {
      const firstError = result.error.issues[0];
      return c.json(
        {
          error: "validation",
          message: firstError?.message || "Validation failed",
        },
        400,
      );
    }
  }),
  async (c) => {
    try {
      const toolId = c.req.param("id");
      const body = c.req.valid("json");

      const updatedTool = await updateTool(toolId, body);

      if (!updatedTool) {
        return c.json(
          {
            error: "not_found",
            message: "Tool not found",
          },
          404,
        );
      }

      return c.json(
        {
          tool: {
            id: updatedTool.id,
            name: updatedTool.name,
            description: updatedTool.description,
            sourceDescription: updatedTool.sourceDescription,
            parametersSchema: updatedTool.parametersSchema,
            sourceFilePath: updatedTool.sourceFilePath,
            workspaceDir: updatedTool.workspaceDir,
            enabled: updatedTool.enabled,
            detectedHookParams: updatedTool.detectedHookParams || [],
            createdAt: updatedTool.createdAt.toISOString(),
            updatedAt: updatedTool.updatedAt.toISOString(),
          },
        },
        200,
      );
    } catch (error) {
      return c.json(
        {
          error: "internal_error",
          message:
            error instanceof Error ? error.message : "Failed to update tool",
        },
        500,
      );
    }
  },
);

export default toolsRouter;

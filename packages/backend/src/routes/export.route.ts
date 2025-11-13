import { Hono } from "hono";
import type { Context } from "hono";

import { generateExportInstructions } from "@/services/export.service";

const exportRouter = new Hono();

exportRouter.post("/", async (c: Context) => {
  try {
    const body = await c.req.json<{ includeDisabledTools?: boolean }>();
    const includeDisabledTools = body.includeDisabledTools ?? false;

    const result = await generateExportInstructions({ includeDisabledTools });

    return c.json(
      {
        markdown: result.markdown,
        generatedAt: result.generatedAt.toISOString(),
        toolsIncluded: result.toolsIncluded,
        advancedOptions: result.advancedOptions,
      },
      200,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "No tools configured" ||
        error.message === "No project configured")
    ) {
      return c.json(
        {
          error: "not_found",
          message: error.message,
        },
        404,
      );
    }

    return c.json(
      {
        error: "internal_error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate export instructions",
      },
      500,
    );
  }
});

export default exportRouter;

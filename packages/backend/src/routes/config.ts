import { Hono } from "hono";
import type { Context } from "hono";
import type { ConfigurationResponse } from "@promptalicious/shared-infra";

import { getConfig } from "../services/configService.js";

const configRouter = new Hono();

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
          availableModels: ["gpt-4o-mini"],
        },
        200,
      );
    }

    const response: ConfigurationResponse = {
      config: {
        id: 1 as const,
        selectedModel: config.selectedModel,
        providerEndpoint: config.providerEndpoint ?? undefined,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      },
      availableModels: ["gpt-4o-mini"],
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
        availableModels: ["gpt-4o-mini"],
      },
      200,
    );
  }
});

export default configRouter;

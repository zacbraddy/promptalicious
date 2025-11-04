import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import type { Context } from "hono";

import { logger } from "./lib/logger.js";

const app = new Hono();

app.use("*", honoLogger());

app.use(
  "*",
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);

app.onError((err, c) => {
  logger.error({ err, path: c.req.path }, "Unhandled error");

  return c.json(
    {
      error: {
        message: err.message || "Internal server error",
        type: "unknown",
      },
    },
    500,
  );
});

app.get("/health", (c: Context) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

export default app;

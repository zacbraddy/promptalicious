import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import type { Context } from "hono";

import { errorHandler } from "./middleware/errorHandler.js";

const app = new Hono();

app.use("*", honoLogger());

app.use(
  "*",
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);

app.onError(errorHandler);

app.get("/health", (c: Context) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

export default app;

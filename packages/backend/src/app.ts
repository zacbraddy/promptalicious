import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import type { Context } from "hono";

import { errorHandler } from "./middleware/errorHandler";
import configRouter from "./routes/config";
import pricingRouter from "./routes/pricing";
import executeRouter from "./routes/execute";
import projectConfigurationRouter from "./routes/project-configuration";

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

app.route("/api/config", configRouter);
app.route("/api/pricing", pricingRouter);
app.route("/api/execute", executeRouter);
app.route("/api/project", projectConfigurationRouter);

export default app;

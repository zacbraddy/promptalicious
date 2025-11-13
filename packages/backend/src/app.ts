import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import type { Context } from "hono";

import { errorHandler } from "./middleware/error-handler.middleware";
import configRouter from "./routes/config.route";
import pricingRouter from "./routes/pricing.route";
import executeRouter from "./routes/execute.route";
import projectConfigurationRouter from "./routes/project-configuration.route";
import toolsRouter from "./routes/tools.route";
import exportRouter from "./routes/export.route";

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
app.route("/api/tools", toolsRouter);
app.route("/api/export", exportRouter);

export default app;

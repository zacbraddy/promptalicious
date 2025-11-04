import { serve } from "@hono/node-server";

import app from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./lib/logger.js";

logger.info(`Starting server on port ${config.server.port}...`);

serve(
  {
    fetch: app.fetch,
    port: config.server.port,
  },
  (info) => {
    logger.info(`Server listening on http://localhost:${info.port}`);
  },
);

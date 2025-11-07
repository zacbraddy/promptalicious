import { serve } from "@hono/node-server";

import app from "./app";
import { config } from "./config";
import { logger } from "./lib/logger";
import { initializePricingCache } from "./services/pricingService";
import { initializeExchangeRateCache } from "./services/exchangeRateService";

async function startServer() {
  logger.info(`Starting server on port ${config.server.port}...`);

  await Promise.all([initializePricingCache(), initializeExchangeRateCache()]);

  serve(
    {
      fetch: app.fetch,
      port: config.server.port,
    },
    (info) => {
      logger.info(`Server listening on http://localhost:${info.port}`);
    },
  );
}

startServer().catch((error) => {
  logger.error({ error }, "Failed to start server");
  process.exit(1);
});

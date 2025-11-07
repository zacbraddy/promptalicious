import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

import { config } from "../config";
import { logger } from "../lib/logger";

async function runMigrations() {
  const databaseUrl = config.database.url;

  logger.info("Starting database migrations...");
  logger.info(`Connecting to: ${databaseUrl.replace(/:[^:@]+@/, ":****@")}`);

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    logger.info("Database connection established");

    const db = drizzle(client);

    await migrate(db, { migrationsFolder: "./drizzle" });

    logger.info("Migrations completed successfully");
  } catch (error) {
    logger.error({ err: error }, "Migration failed");
    throw error;
  } finally {
    await client.end();
    logger.info("Database connection closed");
  }
}

runMigrations()
  .then(() => {
    logger.info("Migration script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ err: error }, "Migration script failed");
    process.exit(1);
  });

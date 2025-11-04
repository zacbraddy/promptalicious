import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { config } from "../config/index.js";
import { logger } from "../lib/logger.js";

import * as schema from "./schema.js";

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.database.url,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected database error");
});

pool.on("connect", () => {
  logger.info("Database pool connection established");
});

export const db = drizzle(pool, { schema });

export async function testConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    logger.info("Database connection successful");
    client.release();
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "Database connection failed",
    );
    throw err;
  }
}

export async function closeConnection(): Promise<void> {
  await pool.end();
  logger.info("Database pool closed");
}

import { execSync } from "child_process";

import pg from "pg";

import { testConnection } from "../../src/services/config.service.js";

export default async function setup({
  provide,
}: {
  provide: (key: string, value: unknown) => void;
}) {
  console.log("Starting PostgreSQL Docker container for integration tests...");

  try {
    const isRunning = execSync(
      'docker ps --filter "name=promptalicious-postgres" --format "{{.Names}}"',
      { encoding: "utf-8" },
    ).trim();

    if (!isRunning) {
      console.log("PostgreSQL container not running, starting it now...");
      execSync("docker compose up -d", { stdio: "inherit", cwd: "../.." });

      console.log("Waiting for PostgreSQL to be healthy...");
      let retries = 60;
      while (retries > 0) {
        try {
          const healthStatus = execSync(
            'docker inspect --format="{{.State.Health.Status}}" promptalicious-postgres',
            { encoding: "utf-8" },
          ).trim();

          if (healthStatus === "healthy") {
            console.log("PostgreSQL is healthy!");
            break;
          }

          console.log(`Health status: ${healthStatus}, waiting...`);
        } catch {
          console.log(
            `Waiting for container to start... (${retries} attempts left)`,
          );
        }

        retries--;
        if (retries === 0) {
          const logs = execSync("docker logs promptalicious-postgres", {
            encoding: "utf-8",
          });
          console.error("PostgreSQL logs:", logs);
          throw new Error(
            "PostgreSQL failed to become healthy after 60 seconds",
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log("Running database migrations...");
      execSync("pnpm db:migrate", { stdio: "inherit" });
      console.log("Database migrations completed!");
    } else {
      console.log("PostgreSQL container already running");
    }

    console.log("Validating database configuration for integration tests...");
    const client = new pg.Client({
      connectionString:
        "postgresql://postgres:postgres@localhost:5432/promptalicious",
    });

    try {
      await client.connect();
      const result = await client.query<{ id: number; api_key: string }>(
        "SELECT id, api_key FROM llm_config WHERE id = 1",
      );

      if (result.rows.length === 0 || !result.rows[0]?.api_key) {
        console.error("\n" + "=".repeat(80));
        console.error("❌ INTEGRATION TEST SETUP ERROR");
        console.error("=".repeat(80));
        console.error(
          "\nThe database does not have a valid API key configured.",
        );
        console.error(
          "Integration tests require a real OpenAI API key in the database.\n",
        );
        console.error("To fix this:");
        console.error(
          "1. Start both backend and frontend development servers:",
        );
        console.error("   pnpm dev\n");
        console.error("2. Open the frontend in your browser:");
        console.error("   http://localhost:5173\n");
        console.error(
          "3. Navigate to Settings and configure your OpenAI API key",
        );
        console.error("4. Re-run the integration tests");
        console.error("=".repeat(80) + "\n");
        throw new Error(
          "Integration tests cannot run without a valid API key in the database",
        );
      }

      const apiKeyPrefix = result.rows[0].api_key.substring(0, 7);
      if (!apiKeyPrefix.startsWith("sk-")) {
        console.error("\n" + "=".repeat(80));
        console.error("❌ INTEGRATION TEST SETUP ERROR");
        console.error("=".repeat(80));
        console.error("\nThe API key in the database appears to be invalid.");
        console.error(
          `Expected format: sk-... but found: ${apiKeyPrefix}...\n`,
        );
        console.error("Please configure a valid OpenAI API key (see above).");
        console.error("=".repeat(80) + "\n");
        throw new Error("Invalid API key format in database");
      }

      console.log(
        `✅ Database configuration validated (API key: ${apiKeyPrefix}...)`,
      );

      console.log("Testing API key connection to OpenAI...");
      const connectionTest = await testConnection(
        result.rows[0].api_key,
        "gpt-4o-mini",
        undefined,
      );

      if (!connectionTest.success) {
        console.error("\n" + "=".repeat(80));
        console.error("❌ INTEGRATION TEST SETUP ERROR");
        console.error("=".repeat(80));
        console.error(
          "\nThe API key in the database failed to connect to OpenAI.",
        );
        console.error(`Error: ${connectionTest.message}\n`);
        console.error("Integration tests require a working OpenAI API key.\n");
        console.error("To fix this:");
        console.error("1. Check your OpenAI API key is valid and has credits");
        console.error(
          "2. Update your API key using the frontend Settings page",
        );
        console.error("3. Re-run the integration tests");
        console.error("=".repeat(80) + "\n");
        throw new Error("API key in database failed to connect to OpenAI");
      }

      console.log("✅ API key successfully connected to OpenAI");
    } finally {
      await client.end();
    }

    provide("postgresReady", true);
  } catch (error) {
    console.error("Failed to start PostgreSQL:", error);
    throw error;
  }

  return () => {
    console.log("Global teardown: PostgreSQL container will remain running");
  };
}

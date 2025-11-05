#!/usr/bin/env tsx
import { execSync } from "child_process";

/* eslint-disable no-console */

async function startDatabase() {
  console.log("Starting PostgreSQL Docker container...");

  try {
    const isRunning = execSync(
      'docker ps --filter "name=promptalicious-postgres" --format "{{.Names}}"',
      { encoding: "utf-8" },
    ).trim();

    if (isRunning) {
      console.log("PostgreSQL container is already running ✓");
      return;
    }

    console.log("Starting PostgreSQL container...");
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
          console.log("PostgreSQL is healthy! ✓");
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
        throw new Error("PostgreSQL failed to become healthy after 60 seconds");
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("Running database migrations...");
    execSync("pnpm db:migrate", { stdio: "inherit" });
    console.log("Database migrations completed! ✓");
    console.log("\nPostgreSQL is ready to accept connections!");
  } catch (error) {
    console.error("Failed to start PostgreSQL:", error);
    throw error;
  }
}

startDatabase().catch((error) => {
  console.error("Database start failed:", error);
  process.exit(1);
});

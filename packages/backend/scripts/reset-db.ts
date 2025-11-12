#!/usr/bin/env tsx
import { execSync } from "child_process";

async function resetDatabase() {
  console.log("Resetting PostgreSQL Docker container...");
  console.log("⚠️  WARNING: This will delete all data in the database!");

  try {
    const isRunning = execSync(
      'docker ps --filter "name=promptalicious-postgres" --format "{{.Names}}"',
      { encoding: "utf-8" },
    ).trim();

    if (isRunning) {
      console.log("Stopping PostgreSQL container...");
      execSync("docker compose stop", { stdio: "inherit", cwd: "../.." });
    }

    console.log("Removing PostgreSQL container and volumes...");
    execSync("docker compose down -v", { stdio: "inherit", cwd: "../.." });

    console.log("Starting fresh PostgreSQL container...");
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

    console.log("Running database migrations on fresh database...");
    execSync("pnpm db:migrate", { stdio: "inherit" });
    console.log("Database migrations completed! ✓");
    console.log(
      "\nPostgreSQL has been reset and is ready to accept connections!",
    );
  } catch (error) {
    console.error("Failed to reset PostgreSQL:", error);
    throw error;
  }
}

resetDatabase().catch((error) => {
  console.error("Database reset failed:", error);
  process.exit(1);
});

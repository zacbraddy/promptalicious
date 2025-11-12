#!/usr/bin/env tsx
import { execSync } from "child_process";

function stopDatabase() {
  console.log("Stopping PostgreSQL Docker container...");

  try {
    const isRunning = execSync(
      'docker ps --filter "name=promptalicious-postgres" --format "{{.Names}}"',
      { encoding: "utf-8" },
    ).trim();

    if (!isRunning) {
      console.log("PostgreSQL container is not running");
      return;
    }

    console.log("Stopping PostgreSQL container...");
    execSync("docker compose stop", { stdio: "inherit", cwd: "../.." });
    console.log("PostgreSQL container stopped ✓");
  } catch (error) {
    console.error("Failed to stop PostgreSQL:", error);
    throw error;
  }
}

stopDatabase();

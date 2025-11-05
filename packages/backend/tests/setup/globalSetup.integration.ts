import { execSync } from "child_process";

/* eslint-disable no-console */

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

    provide("postgresReady", true);
  } catch (error) {
    console.error("Failed to start PostgreSQL:", error);
    throw error;
  }

  return () => {
    console.log("Global teardown: PostgreSQL container will remain running");
  };
}

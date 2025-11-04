import { config as loadDotenv } from "dotenv";

loadDotenv();

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];

  if (!value && defaultValue === undefined) {
    throw new Error(
      `Required environment variable ${name} is not set. Please check your .env file.`,
    );
  }

  return value || defaultValue!;
}

export const config = {
  server: {
    port: Number(getEnvVar("PORT", "3000")),
  },
  database: {
    url: getEnvVar(
      "DATABASE_URL",
      "postgresql://postgres:postgres@localhost:5432/promptalicious",
    ),
  },
  logging: {
    level: getEnvVar("LOG_LEVEL", "info"),
  },
  nodeEnv: getEnvVar("NODE_ENV", "development"),
  isDevelopment: getEnvVar("NODE_ENV", "development") === "development",
  isProduction: getEnvVar("NODE_ENV", "development") === "production",
} as const;

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL || "postgresql://localhost:5432/promptalicious",
  },
});

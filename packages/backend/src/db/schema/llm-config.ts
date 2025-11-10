import {
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const llmConfig = pgTable(
  "llm_config",
  {
    id: integer("id").primaryKey().default(1),
    selectedModel: varchar("selected_model", { length: 255 })
      .notNull()
      .default("gpt-4o-mini"),
    apiKey: text("api_key").notNull(),
    baseURL: varchar("base_url", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [check("single_config", sql`${table.id} = 1`)],
);

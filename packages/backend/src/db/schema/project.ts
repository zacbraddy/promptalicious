import { integer, pgTable, text, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const projectConfiguration = pgTable(
  "project_configuration",
  {
    id: integer("id").primaryKey().default(1),
    name: text("name").notNull(),
    targetProjectPath: text("target_project_path").notNull(),
    workspacePath: text("workspace_path").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [check("single_project_config", sql`${table.id} = 1`)],
);

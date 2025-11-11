import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const tools = pgTable("tools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sourceDescription: text("source_description"),
  parametersSchema: jsonb("parameters_schema").notNull(),
  sourceFilePath: text("source_file_path").notNull(),
  workspaceDir: text("workspace_dir").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  detectedHookParams: jsonb("detected_hook_params"),
  typeImports: jsonb("type_imports"),
  environmentTypes: jsonb("environment_types"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

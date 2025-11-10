CREATE TABLE "project_configuration" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"target_project_path" text NOT NULL,
	"workspace_path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "single_project_config" CHECK ("project_configuration"."id" = 1)
);

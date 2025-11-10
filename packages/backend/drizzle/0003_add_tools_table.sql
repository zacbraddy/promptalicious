CREATE TABLE "tools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"source_description" text,
	"parameters_schema" jsonb NOT NULL,
	"source_file_path" text NOT NULL,
	"workspace_dir" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"detected_hook_params" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

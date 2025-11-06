CREATE TABLE "exchange_rates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "exchange_rates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"from_currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"to_currency" varchar(3) DEFAULT 'GBP' NOT NULL,
	"rate" numeric(10, 6) NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_rates_from_to_unique" UNIQUE("from_currency","to_currency")
);
--> statement-breakpoint
CREATE TABLE "llm_config" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"selected_model" varchar(255) DEFAULT 'gpt-4o-mini' NOT NULL,
	"api_key" text NOT NULL,
	"provider_endpoint" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "single_config" CHECK ("llm_config"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "pricing_info" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pricing_info_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"model" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"input_token_price_usd" numeric(12, 10) NOT NULL,
	"output_token_price_usd" numeric(12, 10) NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_info_model_provider_unique" UNIQUE("model","provider")
);

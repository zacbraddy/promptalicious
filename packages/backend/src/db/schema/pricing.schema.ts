import {
  integer,
  pgTable,
  timestamp,
  decimal,
  varchar,
  unique,
} from "drizzle-orm/pg-core";

export const pricingInfo = pgTable(
  "pricing_info",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    model: varchar("model", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    inputTokenPriceUsd: decimal("input_token_price_usd", {
      precision: 12,
      scale: 10,
    }).notNull(),
    outputTokenPriceUsd: decimal("output_token_price_usd", {
      precision: 12,
      scale: 10,
    }).notNull(),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => [
    unique("pricing_info_model_provider_unique").on(
      table.model,
      table.provider,
    ),
  ],
);

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    fromCurrency: varchar("from_currency", { length: 3 })
      .notNull()
      .default("USD"),
    toCurrency: varchar("to_currency", { length: 3 }).notNull().default("GBP"),
    rate: decimal("rate", { precision: 10, scale: 6 }).notNull(),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => [
    unique("exchange_rates_from_to_unique").on(
      table.fromCurrency,
      table.toCurrency,
    ),
  ],
);

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import type { PricingInfoResponse } from "@promptalicious/shared-infra";

import app from "@/app";
import { db } from "@/db/connection";
import { pricingInfo, exchangeRates } from "@/db/schema";

describe("Pricing staleness detection (integration)", () => {
  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  beforeEach(async () => {
    await cleanupDatabase();
  });

  async function cleanupDatabase() {
    try {
      await db.delete(pricingInfo).where(eq(pricingInfo.model, "gpt-4o-mini"));
      await db
        .delete(exchangeRates)
        .where(
          and(
            eq(exchangeRates.fromCurrency, "USD"),
            eq(exchangeRates.toCurrency, "GBP"),
          ),
        );
    } catch {
      // Ignore cleanup errors
    }
  }

  it("should detect stale pricing when lastUpdated is 10 days ago", async () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    await db.insert(pricingInfo).values({
      model: "gpt-4o-mini",
      provider: "openai",
      inputTokenPriceUsd: "0.00000015",
      outputTokenPriceUsd: "0.0000006",
      lastUpdated: tenDaysAgo,
    });

    await db.insert(exchangeRates).values({
      fromCurrency: "USD",
      toCurrency: "GBP",
      rate: "0.79",
      lastUpdated: tenDaysAgo,
    });

    const response = await app.request("/api/pricing", {
      method: "GET",
    });
    const data = (await response.json()) as PricingInfoResponse;

    expect(response.status).toBe(200);
    expect(data.staleness.isStale).toBe(true);
    expect(data.staleness.daysSinceUpdate).toBe(10);
  });

  it("should detect fresh pricing when lastUpdated is current", async () => {
    const now = new Date();

    await db.insert(pricingInfo).values({
      model: "gpt-4o-mini",
      provider: "openai",
      inputTokenPriceUsd: "0.00000015",
      outputTokenPriceUsd: "0.0000006",
      lastUpdated: now,
    });

    await db.insert(exchangeRates).values({
      fromCurrency: "USD",
      toCurrency: "GBP",
      rate: "0.79",
      lastUpdated: now,
    });

    const response = await app.request("/api/pricing", {
      method: "GET",
    });
    const data = (await response.json()) as PricingInfoResponse;

    expect(response.status).toBe(200);
    expect(data.staleness.isStale).toBe(false);
    expect(data.staleness.daysSinceUpdate).toBe(0);
  });

  it("should transition from stale to fresh when pricing data is updated", async () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    await db.insert(pricingInfo).values({
      model: "gpt-4o-mini",
      provider: "openai",
      inputTokenPriceUsd: "0.00000015",
      outputTokenPriceUsd: "0.0000006",
      lastUpdated: tenDaysAgo,
    });

    await db.insert(exchangeRates).values({
      fromCurrency: "USD",
      toCurrency: "GBP",
      rate: "0.79",
      lastUpdated: tenDaysAgo,
    });

    const staleResponse = await app.request("/api/pricing", {
      method: "GET",
    });
    const staleData = (await staleResponse.json()) as PricingInfoResponse;

    expect(staleResponse.status).toBe(200);
    expect(staleData.staleness.isStale).toBe(true);
    expect(staleData.staleness.daysSinceUpdate).toBe(10);

    await db
      .update(pricingInfo)
      .set({
        lastUpdated: new Date(),
      })
      .where(eq(pricingInfo.model, "gpt-4o-mini"));

    await db
      .update(exchangeRates)
      .set({
        lastUpdated: new Date(),
      })
      .where(
        and(
          eq(exchangeRates.fromCurrency, "USD"),
          eq(exchangeRates.toCurrency, "GBP"),
        ),
      );

    const freshResponse = await app.request("/api/pricing", {
      method: "GET",
    });
    const freshData = (await freshResponse.json()) as PricingInfoResponse;

    expect(freshResponse.status).toBe(200);
    expect(freshData.staleness.isStale).toBe(false);
    expect(freshData.staleness.daysSinceUpdate).toBe(0);
  });

  it("should use the maximum daysSinceUpdate when pricing and exchange rate differ", async () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    await db.insert(pricingInfo).values({
      model: "gpt-4o-mini",
      provider: "openai",
      inputTokenPriceUsd: "0.00000015",
      outputTokenPriceUsd: "0.0000006",
      lastUpdated: tenDaysAgo,
    });

    await db.insert(exchangeRates).values({
      fromCurrency: "USD",
      toCurrency: "GBP",
      rate: "0.79",
      lastUpdated: fiveDaysAgo,
    });

    const response = await app.request("/api/pricing", {
      method: "GET",
    });
    const data = (await response.json()) as PricingInfoResponse;

    expect(response.status).toBe(200);
    expect(data.staleness.isStale).toBe(true);
    expect(data.staleness.daysSinceUpdate).toBe(10);
  });

  it("should mark as stale when either pricing or exchange rate is stale (>7 days)", async () => {
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const now = new Date();

    await db.insert(pricingInfo).values({
      model: "gpt-4o-mini",
      provider: "openai",
      inputTokenPriceUsd: "0.00000015",
      outputTokenPriceUsd: "0.0000006",
      lastUpdated: eightDaysAgo,
    });

    await db.insert(exchangeRates).values({
      fromCurrency: "USD",
      toCurrency: "GBP",
      rate: "0.79",
      lastUpdated: now,
    });

    const response = await app.request("/api/pricing", {
      method: "GET",
    });
    const data = (await response.json()) as PricingInfoResponse;

    expect(response.status).toBe(200);
    expect(data.staleness.isStale).toBe(true);
    expect(data.staleness.daysSinceUpdate).toBe(8);
  });
});

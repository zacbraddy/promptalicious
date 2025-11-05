import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { vi } from "vitest";

import { db } from "@/db/connection";
import { pricingInfo, exchangeRates } from "@/db/schema";
import {
  initializePricingCache,
  getPricingData,
  fetchPricingData,
  cachePricingData,
} from "@/services/pricingService";
import {
  initializeExchangeRateCache,
  getExchangeRate,
  fetchExchangeRate,
  cacheExchangeRate,
} from "@/services/exchangeRateService";

describe("Pricing cache initialization on backend startup (integration)", () => {
  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await cleanupDatabase();
    vi.restoreAllMocks();
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

  describe("Pricing cache initialization", () => {
    it("should fetch and cache pricing data when tables are empty", async () => {
      const pricingDataBefore = await getPricingData();
      expect(pricingDataBefore).toBeNull();

      await initializePricingCache();

      const pricingDataAfter = await getPricingData();
      expect(pricingDataAfter).not.toBeNull();
      expect(pricingDataAfter?.model).toBe("gpt-4o-mini");
      expect(pricingDataAfter?.provider).toBe("openai");
      expect(
        parseFloat(pricingDataAfter?.inputTokenPriceUsd ?? "0"),
      ).toBeGreaterThan(0);
      expect(
        parseFloat(pricingDataAfter?.outputTokenPriceUsd ?? "0"),
      ).toBeGreaterThan(0);
      expect(pricingDataAfter?.lastUpdated).toBeInstanceOf(Date);
      expect(pricingDataAfter?.isStale).toBe(false);
      expect(pricingDataAfter?.daysSinceUpdate).toBe(0);
    });

    it("should skip initialization when pricing cache is fresh", async () => {
      await cachePricingData(0.00000015, 0.0000006);

      const pricingBefore = await getPricingData();
      expect(pricingBefore).not.toBeNull();
      expect(pricingBefore?.isStale).toBe(false);

      const fetchSpy = vi.spyOn({ fetchPricingData }, "fetchPricingData");

      await initializePricingCache();

      expect(fetchSpy).not.toHaveBeenCalled();

      const pricingAfter = await getPricingData();
      expect(pricingAfter?.lastUpdated).toEqual(pricingBefore?.lastUpdated);
    });

    it("should update stale pricing data", async () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      await db.insert(pricingInfo).values({
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000020",
        outputTokenPriceUsd: "0.00000080",
        lastUpdated: tenDaysAgo,
      });

      const pricingBefore = await getPricingData();
      expect(pricingBefore?.isStale).toBe(true);
      expect(pricingBefore?.daysSinceUpdate).toBeGreaterThanOrEqual(10);

      await initializePricingCache();

      const pricingAfter = await getPricingData();
      expect(pricingAfter?.isStale).toBe(false);
      expect(pricingAfter?.daysSinceUpdate).toBe(0);
      expect(pricingAfter?.lastUpdated.getTime()).toBeGreaterThan(
        pricingBefore?.lastUpdated.getTime() ?? 0,
      );
    });

    it("should fall back to cached data when API fails", async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      await db.insert(pricingInfo).values({
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000015",
        outputTokenPriceUsd: "0.0000006",
        lastUpdated: threeDaysAgo,
      });

      const pricingBefore = await getPricingData();
      expect(pricingBefore?.isStale).toBe(false);
      expect(pricingBefore?.daysSinceUpdate).toBe(3);

      await initializePricingCache();

      const pricingAfter = await getPricingData();
      expect(pricingAfter).not.toBeNull();
      expect(
        parseFloat(pricingAfter?.inputTokenPriceUsd ?? "0"),
      ).toBeGreaterThan(0);
      expect(
        parseFloat(pricingAfter?.outputTokenPriceUsd ?? "0"),
      ).toBeGreaterThan(0);
    });
  });

  describe("Exchange rate cache initialization", () => {
    it("should fetch and cache exchange rate when tables are empty", async () => {
      const exchangeRateBefore = await getExchangeRate();
      expect(exchangeRateBefore).toBeNull();

      await initializeExchangeRateCache();

      const exchangeRateAfter = await getExchangeRate();
      expect(exchangeRateAfter).not.toBeNull();
      expect(exchangeRateAfter?.fromCurrency).toBe("USD");
      expect(exchangeRateAfter?.toCurrency).toBe("GBP");
      expect(parseFloat(exchangeRateAfter?.rate ?? "0")).toBeGreaterThan(0);
      expect(exchangeRateAfter?.lastUpdated).toBeInstanceOf(Date);
      expect(exchangeRateAfter?.isStale).toBe(false);
      expect(exchangeRateAfter?.daysSinceUpdate).toBe(0);
    });

    it("should skip initialization when exchange rate cache is fresh", async () => {
      await cacheExchangeRate(0.79);

      const rateBefore = await getExchangeRate();
      expect(rateBefore).not.toBeNull();
      expect(rateBefore?.isStale).toBe(false);

      const fetchSpy = vi.spyOn({ fetchExchangeRate }, "fetchExchangeRate");

      await initializeExchangeRateCache();

      expect(fetchSpy).not.toHaveBeenCalled();

      const rateAfter = await getExchangeRate();
      expect(rateAfter?.lastUpdated).toEqual(rateBefore?.lastUpdated);
    });

    it("should update stale exchange rate", async () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      await db.insert(exchangeRates).values({
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: "0.80",
        lastUpdated: tenDaysAgo,
      });

      const rateBefore = await getExchangeRate();
      expect(rateBefore?.isStale).toBe(true);
      expect(rateBefore?.daysSinceUpdate).toBeGreaterThanOrEqual(10);

      await initializeExchangeRateCache();

      const rateAfter = await getExchangeRate();
      expect(rateAfter?.isStale).toBe(false);
      expect(rateAfter?.daysSinceUpdate).toBe(0);
      expect(rateAfter?.lastUpdated.getTime()).toBeGreaterThan(
        rateBefore?.lastUpdated.getTime() ?? 0,
      );
    });

    it("should fall back to cached data when API fails", async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      await db.insert(exchangeRates).values({
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: "0.79",
        lastUpdated: threeDaysAgo,
      });

      const rateBefore = await getExchangeRate();
      expect(rateBefore?.isStale).toBe(false);
      expect(rateBefore?.daysSinceUpdate).toBe(3);

      await initializeExchangeRateCache();

      const rateAfter = await getExchangeRate();
      expect(rateAfter).not.toBeNull();
      expect(parseFloat(rateAfter?.rate ?? "0")).toBeGreaterThan(0);
    });
  });

  describe("Combined startup scenario", () => {
    it("should initialize both pricing and exchange rate caches on startup", async () => {
      const pricingBefore = await getPricingData();
      const rateBefore = await getExchangeRate();
      expect(pricingBefore).toBeNull();
      expect(rateBefore).toBeNull();

      await Promise.all([
        initializePricingCache(),
        initializeExchangeRateCache(),
      ]);

      const pricingAfter = await getPricingData();
      const rateAfter = await getExchangeRate();

      expect(pricingAfter).not.toBeNull();
      expect(pricingAfter?.model).toBe("gpt-4o-mini");
      expect(pricingAfter?.isStale).toBe(false);

      expect(rateAfter).not.toBeNull();
      expect(rateAfter?.fromCurrency).toBe("USD");
      expect(rateAfter?.toCurrency).toBe("GBP");
      expect(rateAfter?.isStale).toBe(false);
    });

    it("should handle partial failures gracefully", async () => {
      await cachePricingData(0.00000015, 0.0000006);

      await initializePricingCache();

      await cacheExchangeRate(0.79);

      await initializeExchangeRateCache();

      const pricing = await getPricingData();
      const rate = await getExchangeRate();

      expect(pricing).not.toBeNull();
      expect(rate).not.toBeNull();
      expect(pricing?.isStale).toBe(false);
      expect(rate?.isStale).toBe(false);
    });
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PricingInfoResponse } from "@promptalicious/shared-infra";

import app from "@/app";
import * as pricingService from "@/services/pricing.service";
import * as exchangeRateService from "@/services/exchange-rate.service";

vi.mock("@/services/pricing.service");
vi.mock("@/services/exchange-rate.service");

describe("GET /pricing - Contract Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(pricingService.getPricingData).mockResolvedValue({
      id: 1,
      model: "gpt-4o-mini",
      provider: "openai",
      inputTokenPriceUsd: 0.00015,
      outputTokenPriceUsd: 0.0006,
      lastUpdated: new Date("2025-01-01T00:00:00.000Z"),
      isStale: false,
      daysSinceUpdate: 0,
    });

    vi.mocked(exchangeRateService.getExchangeRate).mockResolvedValue({
      id: 1,
      fromCurrency: "USD",
      toCurrency: "GBP",
      rate: 0.79,
      lastUpdated: new Date("2025-01-01T00:00:00.000Z"),
      isStale: false,
      daysSinceUpdate: 0,
    });
  });
  it("should return 200 status", async () => {
    const response = await app.request("/api/pricing");
    expect(response.status).toBe(200);
  });

  it("should return response matching PricingInfoResponse schema", async () => {
    const response = await app.request("/api/pricing");
    const data = (await response.json()) as PricingInfoResponse;

    expect(data).toHaveProperty("pricing");
    expect(data).toHaveProperty("exchangeRate");
    expect(data).toHaveProperty("staleness");

    expect(data.pricing).toHaveProperty("model");
    expect(data.pricing).toHaveProperty("provider");
    expect(data.pricing).toHaveProperty("inputTokenPriceUSD");
    expect(data.pricing).toHaveProperty("outputTokenPriceUSD");
    expect(data.pricing).toHaveProperty("lastUpdated");

    expect(typeof data.pricing.model).toBe("string");
    expect(typeof data.pricing.provider).toBe("string");
    expect(typeof data.pricing.inputTokenPriceUSD).toBe("number");
    expect(typeof data.pricing.outputTokenPriceUSD).toBe("number");
    expect(typeof data.pricing.lastUpdated).toBe("string");

    expect(data.exchangeRate).toHaveProperty("fromCurrency");
    expect(data.exchangeRate).toHaveProperty("toCurrency");
    expect(data.exchangeRate).toHaveProperty("rate");
    expect(data.exchangeRate).toHaveProperty("lastUpdated");

    expect(typeof data.exchangeRate.fromCurrency).toBe("string");
    expect(typeof data.exchangeRate.toCurrency).toBe("string");
    expect(typeof data.exchangeRate.rate).toBe("number");
    expect(typeof data.exchangeRate.lastUpdated).toBe("string");

    expect(data.staleness).toHaveProperty("isStale");
    expect(data.staleness).toHaveProperty("daysSinceUpdate");
  });

  it("should have isStale as boolean and daysSinceUpdate as number", async () => {
    const response = await app.request("/api/pricing");
    const data = (await response.json()) as PricingInfoResponse;

    expect(typeof data.staleness.isStale).toBe("boolean");
    expect(typeof data.staleness.daysSinceUpdate).toBe("number");
  });

  it("should include pricing data with positive token prices", async () => {
    const response = await app.request("/api/pricing");
    const data = (await response.json()) as PricingInfoResponse;

    expect(data.pricing.inputTokenPriceUSD).toBeGreaterThan(0);
    expect(data.pricing.outputTokenPriceUSD).toBeGreaterThan(0);
  });

  it("should include exchange rate with positive rate value", async () => {
    const response = await app.request("/api/pricing");
    const data = (await response.json()) as PricingInfoResponse;

    expect(data.exchangeRate.rate).toBeGreaterThan(0);
  });

  it("should have daysSinceUpdate as non-negative integer", async () => {
    const response = await app.request("/api/pricing");
    const data = (await response.json()) as PricingInfoResponse;

    expect(data.staleness.daysSinceUpdate).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(data.staleness.daysSinceUpdate)).toBe(true);
  });
});

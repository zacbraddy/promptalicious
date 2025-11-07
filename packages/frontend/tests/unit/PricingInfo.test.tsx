import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PricingInfoResponse } from "@promptalicious/shared-infra";

import { PricingInfo } from "@/components/PricingInfo";

describe("PricingInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display pricing values correctly when data is fresh", () => {
    const mockPricingResponse: PricingInfoResponse = {
      pricing: {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUSD: 0.00000015,
        outputTokenPriceUSD: 0.0000006,
        lastUpdated: new Date().toISOString(),
      },
      exchangeRate: {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: 0.79,
        lastUpdated: new Date().toISOString(),
      },
      staleness: {
        isStale: false,
        daysSinceUpdate: 0,
      },
    };

    render(<PricingInfo pricingData={mockPricingResponse} />);

    expect(screen.getByText("Model:")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o-mini")).toBeInTheDocument();

    expect(screen.getByText("Provider:")).toBeInTheDocument();
    expect(screen.getByText("openai")).toBeInTheDocument();

    expect(screen.getByText("Input Tokens:")).toBeInTheDocument();
    expect(
      screen.getByText(/\$0\.00000015 USD \(£0\.00000012 GBP\) per token/),
    ).toBeInTheDocument();

    expect(screen.getByText("Output Tokens:")).toBeInTheDocument();
    expect(
      screen.getByText(/\$0\.00000060 USD \(£0\.00000047 GBP\) per token/),
    ).toBeInTheDocument();

    expect(screen.getByText("Exchange Rate:")).toBeInTheDocument();
    expect(screen.getByText(/1 USD = 0\.7900 GBP/)).toBeInTheDocument();

    expect(screen.getByText("Last Updated:")).toBeInTheDocument();
  });

  it("should format prices with 8 decimal places in USD and GBP", () => {
    const mockPricingResponse: PricingInfoResponse = {
      pricing: {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUSD: 0.000000123,
        outputTokenPriceUSD: 0.000000456,
        lastUpdated: new Date().toISOString(),
      },
      exchangeRate: {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: 0.8,
        lastUpdated: new Date().toISOString(),
      },
      staleness: {
        isStale: false,
        daysSinceUpdate: 0,
      },
    };

    render(<PricingInfo pricingData={mockPricingResponse} />);

    expect(
      screen.getByText(/\$0\.00000012 USD \(£0\.00000010 GBP\) per token/),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/\$0\.00000046 USD \(£0\.00000036 GBP\) per token/),
    ).toBeInTheDocument();
  });

  it("should format exchange rate with 4 decimal places", () => {
    const mockPricingResponse: PricingInfoResponse = {
      pricing: {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUSD: 0.00000015,
        outputTokenPriceUSD: 0.0000006,
        lastUpdated: new Date().toISOString(),
      },
      exchangeRate: {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: 0.79345678,
        lastUpdated: new Date().toISOString(),
      },
      staleness: {
        isStale: false,
        daysSinceUpdate: 0,
      },
    };

    render(<PricingInfo pricingData={mockPricingResponse} />);

    expect(screen.getByText(/1 USD = 0\.7935 GBP/)).toBeInTheDocument();
  });

  it("should format last updated date in British English format", () => {
    const testDate = new Date("2025-01-15T14:30:00.000Z");

    const mockPricingResponse: PricingInfoResponse = {
      pricing: {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUSD: 0.00000015,
        outputTokenPriceUSD: 0.0000006,
        lastUpdated: testDate.toISOString(),
      },
      exchangeRate: {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: 0.79,
        lastUpdated: testDate.toISOString(),
      },
      staleness: {
        isStale: false,
        daysSinceUpdate: 0,
      },
    };

    render(<PricingInfo pricingData={mockPricingResponse} />);

    expect(screen.getByText("Last Updated:")).toBeInTheDocument();
    expect(screen.getByText(/15 January 2025/)).toBeInTheDocument();
  });

  it("should display different models and providers correctly", () => {
    const mockPricingResponse: PricingInfoResponse = {
      pricing: {
        id: 2,
        model: "gpt-4-turbo",
        provider: "anthropic",
        inputTokenPriceUSD: 0.000001,
        outputTokenPriceUSD: 0.000003,
        lastUpdated: new Date().toISOString(),
      },
      exchangeRate: {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: 0.79,
        lastUpdated: new Date().toISOString(),
      },
      staleness: {
        isStale: false,
        daysSinceUpdate: 0,
      },
    };

    render(<PricingInfo pricingData={mockPricingResponse} />);

    expect(screen.getByText("gpt-4-turbo")).toBeInTheDocument();
    expect(screen.getByText("anthropic")).toBeInTheDocument();
  });

  it("should calculate GBP prices correctly from USD prices and exchange rate", () => {
    const usdInputPrice = 0.00000015;
    const usdOutputPrice = 0.0000006;
    const exchangeRate = 0.8;

    const mockPricingResponse: PricingInfoResponse = {
      pricing: {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUSD: usdInputPrice,
        outputTokenPriceUSD: usdOutputPrice,
        lastUpdated: new Date().toISOString(),
      },
      exchangeRate: {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: exchangeRate,
        lastUpdated: new Date().toISOString(),
      },
      staleness: {
        isStale: false,
        daysSinceUpdate: 0,
      },
    };

    render(<PricingInfo pricingData={mockPricingResponse} />);

    const expectedInputGBP = (usdInputPrice * exchangeRate).toFixed(8);
    const expectedOutputGBP = (usdOutputPrice * exchangeRate).toFixed(8);

    expect(
      screen.getByText(
        new RegExp(
          `\\$${usdInputPrice.toFixed(8)} USD \\(£${expectedInputGBP} GBP\\) per token`,
        ),
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        new RegExp(
          `\\$${usdOutputPrice.toFixed(8)} USD \\(£${expectedOutputGBP} GBP\\) per token`,
        ),
      ),
    ).toBeInTheDocument();
  });
});

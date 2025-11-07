import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PricingInfoResponse } from "@promptalicious/shared-infra";

import { PricingInfo } from "@/components/PricingInfo";

describe("PricingInfo", () => {
  it("renders pricing information with sample data", () => {
    const mockPricingData: PricingInfoResponse = {
      pricing: {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUSD: 0.00015,
        outputTokenPriceUSD: 0.0006,
        lastUpdated: "2025-01-07T12:00:00.000Z",
      },
      exchangeRate: {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: 0.79,
        lastUpdated: "2025-01-07T12:00:00.000Z",
      },
      staleness: {
        isStale: false,
        daysSinceUpdate: 0,
      },
    };

    render(<PricingInfo pricingData={mockPricingData} />);

    expect(screen.getByText("Pricing Information")).toBeInTheDocument();
    expect(
      screen.getByText(/Current token pricing for gpt-4o-mini \(openai\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/\$0.000150 USD/)).toBeInTheDocument();
    expect(screen.getByText(/\$0.000600 USD/)).toBeInTheDocument();
    expect(screen.getByText(/1 USD = 0.7900 GBP/)).toBeInTheDocument();
  });

  it("formats prices in both USD and GBP", () => {
    const mockPricingData: PricingInfoResponse = {
      pricing: {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUSD: 0.00015,
        outputTokenPriceUSD: 0.0006,
        lastUpdated: "2025-01-07T12:00:00.000Z",
      },
      exchangeRate: {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: 0.8,
        lastUpdated: "2025-01-07T12:00:00.000Z",
      },
      staleness: {
        isStale: false,
        daysSinceUpdate: 0,
      },
    };

    render(<PricingInfo pricingData={mockPricingData} />);

    expect(screen.getByText(/£0.000120 GBP/)).toBeInTheDocument();
    expect(screen.getByText(/£0.000480 GBP/)).toBeInTheDocument();
  });

  it("displays last updated timestamp in formatted date", () => {
    const mockPricingData: PricingInfoResponse = {
      pricing: {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUSD: 0.00015,
        outputTokenPriceUSD: 0.0006,
        lastUpdated: "2025-01-07T15:30:00.000Z",
      },
      exchangeRate: {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: 0.79,
        lastUpdated: "2025-01-07T15:30:00.000Z",
      },
      staleness: {
        isStale: false,
        daysSinceUpdate: 0,
      },
    };

    render(<PricingInfo pricingData={mockPricingData} />);

    expect(screen.getByText(/7 January 2025/)).toBeInTheDocument();
  });
});

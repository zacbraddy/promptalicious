import { Hono } from "hono";
import type { Context } from "hono";
import type { PricingInfoResponse } from "@promptalicious/shared-infra";

import { getPricingData } from "@/services/pricing.service";
import { getExchangeRate } from "@/services/exchange-rate.service";
import { logger } from "@/lib/logger";

const pricingRouter = new Hono();

pricingRouter.get("/", async (c: Context) => {
  try {
    const pricingData = await getPricingData();
    const exchangeRateData = await getExchangeRate();

    if (!pricingData) {
      return c.json(
        {
          error: "Pricing data not available. Please try again later.",
        },
        500,
      );
    }

    if (!exchangeRateData) {
      return c.json(
        {
          error: "Exchange rate data not available. Please try again later.",
        },
        500,
      );
    }

    const response: PricingInfoResponse = {
      pricing: {
        id: pricingData.id,
        model: pricingData.model,
        provider: pricingData.provider,
        inputTokenPriceUSD: pricingData.inputTokenPriceUsd,
        outputTokenPriceUSD: pricingData.outputTokenPriceUsd,
        lastUpdated: pricingData.lastUpdated.toISOString(),
      },
      exchangeRate: {
        id: exchangeRateData.id,
        fromCurrency: exchangeRateData.fromCurrency,
        toCurrency: exchangeRateData.toCurrency,
        rate: exchangeRateData.rate,
        lastUpdated: exchangeRateData.lastUpdated.toISOString(),
      },
      staleness: {
        isStale: pricingData.isStale || exchangeRateData.isStale,
        daysSinceUpdate: Math.max(
          pricingData.daysSinceUpdate,
          exchangeRateData.daysSinceUpdate,
        ),
      },
    };

    return c.json<PricingInfoResponse>(response, 200);
  } catch (error) {
    logger.error({ error }, "Failed to retrieve pricing information");
    return c.json(
      {
        error: "Failed to retrieve pricing information",
      },
      500,
    );
  }
});

export default pricingRouter;

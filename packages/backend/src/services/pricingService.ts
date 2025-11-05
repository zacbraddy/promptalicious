import axios from "axios";
import { eq } from "drizzle-orm";

import { db } from "@/db/connection";
import { pricingInfo } from "@/db/schema";
import { logger } from "@/lib/logger";

const LLM_PRICING_API_URL = "https://llmpricing.ai/api/prices";

const FALLBACK_PRICING = {
  model: "gpt-4o-mini",
  provider: "openai",
  inputTokenPriceUsd: 0.00000015, // Fallback pricing - last verified 2025-11-05 from llmpricing.ai
  outputTokenPriceUsd: 0.0000006, // Fallback pricing - last verified 2025-11-05 from llmpricing.ai
};

const STALENESS_THRESHOLD_DAYS = 7;

export interface PricingData {
  id: number;
  model: string;
  provider: string;
  inputTokenPriceUsd: string;
  outputTokenPriceUsd: string;
  lastUpdated: Date;
}

export interface PricingDataWithStaleness extends PricingData {
  isStale: boolean;
  daysSinceUpdate: number;
}

interface LLMPricingApiResponse {
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  input_cost: number;
  output_cost: number;
  total_cost: number;
}

export async function fetchPricingData(): Promise<{
  inputTokenPriceUsd: number;
  outputTokenPriceUsd: number;
}> {
  try {
    logger.info("Attempting to fetch pricing data from llmpricing.ai");

    //  We request 1000 tokens instead of 1 to avoid floating-point precision issues.
    // The API returns costs rounded to 6 decimal places, and requesting 1 token results
    // in `input_cost: 0` due to rounding (actual: 0.00000015). Using 1000 tokens gives
    // us `input_cost: 0.00015` which we then divide by 1000 to get the per-token price.

    const response = await axios.get<LLMPricingApiResponse>(
      LLM_PRICING_API_URL,
      {
        params: {
          provider: "OpenAI",
          model: "gpt-4o-mini",
          input_tokens: 1000,
          output_tokens: 1000,
        },
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; promptalicious/0.2.0; +https://github.com/promptalicious)",
        },
      },
    );

    if (
      typeof response.data.input_cost !== "number" ||
      typeof response.data.output_cost !== "number" ||
      response.data.input_cost <= 0 ||
      response.data.output_cost <= 0
    ) {
      logger.warn(
        "Invalid pricing data received from llmpricing.ai, using fallback",
      );
      return {
        inputTokenPriceUsd: FALLBACK_PRICING.inputTokenPriceUsd,
        outputTokenPriceUsd: FALLBACK_PRICING.outputTokenPriceUsd,
      };
    }

    const inputPricePerToken = response.data.input_cost / 1000;
    const outputPricePerToken = response.data.output_cost / 1000;

    logger.info(
      {
        inputPriceUSD: inputPricePerToken.toFixed(10),
        outputPriceUSD: outputPricePerToken.toFixed(10),
      },
      "Successfully fetched pricing data from llmpricing.ai",
    );

    return {
      inputTokenPriceUsd: inputPricePerToken,
      outputTokenPriceUsd: outputPricePerToken,
    };
  } catch (error) {
    logger.error(
      { error },
      "Failed to fetch pricing data from llmpricing.ai, using fallback",
    );
    return {
      inputTokenPriceUsd: FALLBACK_PRICING.inputTokenPriceUsd,
      outputTokenPriceUsd: FALLBACK_PRICING.outputTokenPriceUsd,
    };
  }
}

export async function cachePricingData(
  inputTokenPriceUsd: number,
  outputTokenPriceUsd: number,
): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(pricingInfo)
      .where(eq(pricingInfo.model, FALLBACK_PRICING.model))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(pricingInfo)
        .set({
          inputTokenPriceUsd: inputTokenPriceUsd.toFixed(10),
          outputTokenPriceUsd: outputTokenPriceUsd.toFixed(10),
          lastUpdated: new Date(),
        })
        .where(eq(pricingInfo.model, FALLBACK_PRICING.model));

      logger.info("Updated pricing data in cache");
    } else {
      await db.insert(pricingInfo).values({
        model: FALLBACK_PRICING.model,
        provider: FALLBACK_PRICING.provider,
        inputTokenPriceUsd: inputTokenPriceUsd.toFixed(10),
        outputTokenPriceUsd: outputTokenPriceUsd.toFixed(10),
        lastUpdated: new Date(),
      });

      logger.info("Inserted pricing data into cache");
    }
  } catch (error) {
    logger.error({ error }, "Failed to cache pricing data");
    throw new Error("Failed to cache pricing data");
  }
}

export async function getPricingData(): Promise<PricingDataWithStaleness | null> {
  try {
    const result = await db
      .select()
      .from(pricingInfo)
      .where(eq(pricingInfo.model, FALLBACK_PRICING.model))
      .limit(1);

    if (result.length === 0 || !result[0]) {
      return null;
    }

    const pricing = result[0];
    const now = new Date();
    const lastUpdated = new Date(pricing.lastUpdated);
    const daysSinceUpdate = Math.floor(
      (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24),
    );
    const isStale = daysSinceUpdate > STALENESS_THRESHOLD_DAYS;

    return {
      ...pricing,
      isStale,
      daysSinceUpdate,
    };
  } catch (error) {
    logger.error({ error }, "Failed to retrieve pricing data");
    throw new Error("Failed to retrieve pricing data");
  }
}

export async function initializePricingCache(): Promise<void> {
  try {
    logger.info("Initializing pricing cache");

    const existingPricing = await getPricingData();

    if (existingPricing && !existingPricing.isStale) {
      logger.info(
        { daysSinceUpdate: existingPricing.daysSinceUpdate },
        "Pricing cache is fresh, skipping initialization",
      );
      return;
    }

    const pricing = await fetchPricingData();
    await cachePricingData(
      pricing.inputTokenPriceUsd,
      pricing.outputTokenPriceUsd,
    );

    logger.info("Pricing cache initialized successfully");
  } catch (error) {
    logger.error({ error }, "Failed to initialize pricing cache");

    const existingPricing = await getPricingData();
    if (existingPricing) {
      logger.warn(
        "Using stale cached pricing data due to initialization failure",
      );
    } else {
      logger.warn("No cached pricing data available, will use fallback values");
    }
  }
}

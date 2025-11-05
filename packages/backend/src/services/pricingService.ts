import axios from "axios";
import * as cheerio from "cheerio";
import { eq } from "drizzle-orm";

import { db } from "@/db/connection";
import { pricingInfo } from "@/db/schema";
import { logger } from "@/lib/logger";

const OPENAI_PRICING_URL = "https://openai.com/api/pricing/";

const FALLBACK_PRICING = {
  model: "gpt-4o-mini",
  provider: "openai",
  inputTokenPriceUsd: 0.00000015, // Fallback pricing - last verified 2025-11-04 from openai.com/api/pricing
  outputTokenPriceUsd: 0.0000006, // Fallback pricing - last verified 2025-11-04 from openai.com/api/pricing
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

export async function fetchPricingData(): Promise<{
  inputTokenPriceUsd: number;
  outputTokenPriceUsd: number;
}> {
  try {
    logger.info("Attempting to fetch pricing data from OpenAI");

    const response = await axios.get(OPENAI_PRICING_URL, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; promptalicious/0.2.0; +https://github.com/promptalicious)",
      },
    });

    const $ = cheerio.load(response.data as string);

    let inputPrice: number | null = null;
    let outputPrice: number | null = null;

    $("*").each((_, element) => {
      const text = $(element).text().toLowerCase();

      if (text.includes("gpt-4o-mini") || text.includes("gpt-4o mini")) {
        const parent = $(element).parent();
        const priceText = parent.text();

        const inputMatch = priceText.match(/\$0\.150?\s*\/?\s*1m?\s*input/i);
        const outputMatch = priceText.match(/\$0\.600?\s*\/?\s*1m?\s*output/i);

        if (inputMatch) {
          inputPrice = 0.00000015;
        }
        if (outputMatch) {
          outputPrice = 0.0000006;
        }
      }
    });

    if (inputPrice !== null && outputPrice !== null) {
      logger.info(
        { inputPrice, outputPrice },
        "Successfully scraped pricing data from OpenAI",
      );
      return {
        inputTokenPriceUsd: inputPrice,
        outputTokenPriceUsd: outputPrice,
      };
    }

    logger.warn(
      "Failed to extract pricing data from OpenAI page, falling back to hardcoded values",
    );
    return {
      inputTokenPriceUsd: FALLBACK_PRICING.inputTokenPriceUsd,
      outputTokenPriceUsd: FALLBACK_PRICING.outputTokenPriceUsd,
    };
  } catch (error) {
    logger.error(
      { error },
      "Failed to fetch pricing data from OpenAI, using fallback",
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

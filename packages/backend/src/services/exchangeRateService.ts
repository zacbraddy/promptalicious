import axios from "axios";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/connection";
import { exchangeRates } from "@/db/schema";
import { logger } from "@/lib/logger";

const FRANKFURTER_API_URL =
  "https://api.frankfurter.dev/v1/latest?base=USD&symbols=GBP";

const STALENESS_THRESHOLD_DAYS = 7;

export interface ExchangeRateData {
  id: number;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  lastUpdated: Date;
}

export interface ExchangeRateDataWithStaleness extends ExchangeRateData {
  isStale: boolean;
  daysSinceUpdate: number;
}

interface FrankfurterApiResponse {
  amount: number;
  base: string;
  date: string;
  rates: {
    [key: string]: number;
  };
}

export async function fetchExchangeRate(): Promise<number> {
  try {
    logger.info(
      "Attempting to fetch USD→GBP exchange rate from Frankfurter API",
    );

    const response = await axios.get<FrankfurterApiResponse>(
      FRANKFURTER_API_URL,
      {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; promptalicious/0.2.0; +https://github.com/promptalicious)",
        },
      },
    );

    const rate = response.data.rates.GBP;

    if (typeof rate !== "number" || rate <= 0) {
      throw new Error("Invalid exchange rate returned from API");
    }

    logger.info(
      { rateUSD_to_GBP: rate.toFixed(6) },
      "Successfully fetched USD→GBP exchange rate",
    );
    return rate;
  } catch (error) {
    logger.error(
      { error },
      "Failed to fetch exchange rate from Frankfurter API",
    );
    throw error;
  }
}

export async function cacheExchangeRate(rate: number): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, "USD"),
          eq(exchangeRates.toCurrency, "GBP"),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(exchangeRates)
        .set({
          rate: rate.toFixed(6),
          lastUpdated: new Date(),
        })
        .where(
          and(
            eq(exchangeRates.fromCurrency, "USD"),
            eq(exchangeRates.toCurrency, "GBP"),
          ),
        );

      logger.info("Updated exchange rate in cache");
    } else {
      await db.insert(exchangeRates).values({
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: rate.toFixed(6),
        lastUpdated: new Date(),
      });

      logger.info("Inserted exchange rate into cache");
    }
  } catch (error) {
    logger.error({ error }, "Failed to cache exchange rate");
    throw new Error("Failed to cache exchange rate");
  }
}

export async function getExchangeRate(): Promise<ExchangeRateDataWithStaleness | null> {
  try {
    const result = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, "USD"),
          eq(exchangeRates.toCurrency, "GBP"),
        ),
      )
      .limit(1);

    if (result.length === 0 || !result[0]) {
      return null;
    }

    const exchangeRate = result[0];
    const now = new Date();
    const lastUpdated = new Date(exchangeRate.lastUpdated);
    const daysSinceUpdate = Math.floor(
      (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24),
    );
    const isStale = daysSinceUpdate > STALENESS_THRESHOLD_DAYS;

    return {
      ...exchangeRate,
      isStale,
      daysSinceUpdate,
    };
  } catch (error) {
    logger.error({ error }, "Failed to retrieve exchange rate");
    throw new Error("Failed to retrieve exchange rate");
  }
}

export async function initializeExchangeRateCache(): Promise<void> {
  try {
    logger.info("Initializing exchange rate cache");

    const existingRate = await getExchangeRate();

    if (existingRate && !existingRate.isStale) {
      logger.info(
        { daysSinceUpdate: existingRate.daysSinceUpdate },
        "Exchange rate cache is fresh, skipping initialization",
      );
      return;
    }

    const rate = await fetchExchangeRate();
    await cacheExchangeRate(rate);

    logger.info("Exchange rate cache initialized successfully");
  } catch (error) {
    logger.error({ error }, "Failed to initialize exchange rate cache");

    const existingRate = await getExchangeRate();
    if (existingRate) {
      logger.warn(
        "Using stale cached exchange rate due to initialization failure",
      );
    } else {
      logger.warn(
        "No cached exchange rate available, cost calculations may be unavailable",
      );
    }
  }
}

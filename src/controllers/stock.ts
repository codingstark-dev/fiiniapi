import { Context } from 'hono';
import { cache } from "../utils/cache";
import { fetchWithRetry } from "../utils/fetch";
import { NSE_ENDPOINTS } from "../config/endpoints";
import type { StockPrice, MarketMovers, AllIndices, IpoDetails } from "../types";

const getNSEHeaders = async ({ symbol }: { symbol: string }) => {
  return {
    accept: "*/*",
    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
    dnt: "1",
    referer: `https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`,
    "sec-ch-ua": '"Not?A_Brand";v="99", "Chromium";v="130"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
  };
};

export const getStockPrice = async (c: Context) => {
  const symbol = c.req.param('symbol');
  const cacheKey = `price:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return c.json(cached);

  const headers = await getNSEHeaders({ symbol });
  const response = await fetchWithRetry(
    `${NSE_ENDPOINTS.QUOTE}?symbol=${symbol}`,
    { headers }
  );

  const price: StockPrice = await response.json();
  cache.set(cacheKey, price);
  return c.json(price);
};

// Add other controller methods similarly...
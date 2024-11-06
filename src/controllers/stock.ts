import { Context } from "hono";
import { cache } from "../utils/cache";
import { customFetch } from "../utils/custom-fetch";
import { NSE_ENDPOINTS } from "../config/endpoints";
import type {
  StockPrice,
  MarketMovers,
  AllIndices,
  IpoDetails,
} from "../types";

const getCookies = async () => {
  const url = 'https://www.nseindia.com/market-data/live-market-indices';
  const init: RequestInit = {
    headers: {
      'Host': 'www.nseindia.com',
      'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:77.0) Gecko/20100101 Firefox/77.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
  };

  try {
    const response = await fetch(url, init);
    const cookies = response.headers.get('set-cookie')?.split(',')
      .map(cookie => cookie.split(';')[0].trim())
      .join('; ');
    return cookies;
  } catch (error) {
    console.error('Error fetching cookies:', error);
    return null;
  }
};

const getNSEHeaders = async () => {
  const cookies = await getCookies();
  return {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'Content-Type': 'application/json',
    'user-agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:77.0) Gecko/20100101 Firefox/77.0',
    'DNT': '1',
    'Connection': 'keep-alive',
    'cookie': cookies || '',
    'Host': 'www.nseindia.com'
  };
};

export const getStockPrice = async (c: Context) => {
  const symbol = c.req.param("symbol");
  const cacheKey = `price:${symbol}`;
  
  try {
    const headers = await getNSEHeaders();
    const response = await customFetch(
      `${NSE_ENDPOINTS.QUOTE}?symbol=${symbol}`,
      { headers }
    );
    
    const price: StockPrice = await response.json();
    return c.json(price);
  } catch (error) {
    console.error("Error fetching stock price:", error);
    return c.json({ error: true, message: (error as Error).message }, 500);
  }
};

export const getMarketMovers = async () => {
  try {
    const cacheKey = "market:movers";
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const headers = await getNSEHeaders();
    const [gainers, losers] = await Promise.all([
      fetch("https://www.nseindia.com/api/liveanalysis/gainers/allSec", {
        headers,
        credentials: "include",
      }),
      fetch("https://www.nseindia.com/api/liveanalysis/loosers/allSec", {
        headers,
        credentials: "include",
      }),
    ]);

    const movers: MarketMovers = {
      gainers: await gainers.json(),
      losers: await losers.json(),
    };

    cache.set(cacheKey, movers); // Cache for 5 minutes
    return movers;
  } catch (error) {
    console.log(error);
    return { error: true, message: (error as Error).message, code: 500 };
  }
};

export const getAllIndices = async (c: Context) => {
  try {
    const cacheKey = "market:indices";
    const cached = cache.get(cacheKey);
    if (cached) return c.json(cached);

    const headers = await getNSEHeaders();
    const response = await fetch(
      NSE_ENDPOINTS.INDICES,
      { 
        headers,
        method: 'GET',
      }
    );
    console.log(response);

    if (!response.ok) {
      throw new Error(`Failed to fetch indices: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the data to match your AllIndices type
    const indices: AllIndices[] = data.indices?.map((index: any) => ({
      indexSymbol: index.indexSymbol,
      indexName: index.indexName,
      last: index.last,
      percentChange: index.percentChange,
      variation: index.variation,
      timestamp: new Date().toISOString()
    })) || [];

    cache.set(cacheKey, indices, 5 * 60); // Cache for 5 minutes
    return c.json(indices);
  } catch (error) {
    console.error("Error fetching indices:", error);
    return c.json(
      { error: true, message: (error as Error).message, code: 500 },
      500
    );
  }
};

export const getIpoDetails = async (c: Context) => {
  const symbol = c.req.param("symbol");
  const cacheKey = `stock:${symbol}:ipo`;
  const cached = cache.get(cacheKey);
  if (cached) return c.json(cached);

  const headers = await getNSEHeaders();
  const bidDetails = await customFetch(
    `https://www.nseindia.com/api/ipo-detail?symbol=${symbol}&series=EQ`,
    { headers }
  );

  const ipoDetails: IpoDetails = await bidDetails.json();
  cache.set(cacheKey, ipoDetails);
  return c.json(ipoDetails);
};

export const getCorporateInfo = async (symbol: string, infoType: string) => {
  const cacheKey = `companyDetails-${symbol}`;
  //   const cached = cache.get(cacheKey);
  //   if (cached) return cached;

  const headers = await getNSEHeaders();
  const response = await fetch(
    `https://www.nseindia.com/api/top-corp-info?symbol=${symbol}`,
    {
      headers: headers,
      credentials: "include",
      redirect: "follow",
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  let items = [];

  switch (infoType) {
    case "latest_announcements":
      items =
        data.latest_announcements?.data?.map((announcement: any) => ({
          label: announcement.subject,
          value: announcement.date,
        })) || [];
      break;
    case "corporate_actions":
      items =
        data.corporate_actions?.data?.map((action: any) => ({
          label: action.purpose,
          value: action.exDate,
        })) || [];
      break;
    case "shareholdings_patterns":
      items = Object.entries(data.shareholdings_patterns?.data || {}).map(
        ([key, value]) => ({
          label: key,
          value: value as string,
        })
      );
      break;
    case "financial_results":
      items =
        data.financial_results?.data?.map((result: any) => ({
          label: `Period: ${result.from_date} to ${result.to_date}`,
          value: `Income: ${result.income}, Expenditure: ${result.expenditure}`,
        })) || [];
      break;
    case "board_meeting":
      items = (data.borad_meeting?.data || []).map((meeting: any) => ({
        label: meeting.purpose,
        value: meeting.date,
      }));
      break;
    default:
      throw new Error("Invalid information type requested");
  }

  cache.set(cacheKey, items);
  return items;
};

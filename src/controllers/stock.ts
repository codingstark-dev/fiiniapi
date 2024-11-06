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

// const getNSEHeaders = async ({ symbol }: { symbol: string }) => {
//   return {
//     accept: "*/*",
//     "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
//     dnt: "1",
//     referer: `https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`,
//     "sec-ch-ua": '"Not?A_Brand";v="99", "Chromium";v="130"',
//     "sec-ch-ua-mobile": "?0",
//     "sec-ch-ua-platform": '"macOS"',
//     "sec-fetch-dest": "empty",
//   };
// };
const getNSEHeaders = async () => {
  const baseHeaders: { 
    accept: string; 
    'accept-language': string; 
    'cache-control': string; 
    dnt: string; 
    'sec-ch-ua': string; 
    'sec-ch-ua-mobile': string; 
    'sec-ch-ua-platform': string; 
    'sec-fetch-dest': string; 
    'sec-fetch-mode': string; 
    'sec-fetch-site': string; 
    'sec-fetch-user': string; 
    'upgrade-insecure-requests': string; 
    'user-agent': string; 
    cookie?: string 
  } = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'cache-control': 'max-age=0',
    'dnt': '1',
    'sec-ch-ua': '"Not?A_Brand";v="99", "Chromium";v="130"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  };

  try {
    const homepageResponse = await fetch("https://www.nseindia.com/", {
      headers: baseHeaders,
      redirect: 'follow'
    });

    if (!homepageResponse.ok) {
      throw new Error(`Failed to fetch NSE homepage: ${homepageResponse.status}`);
    }

    const cookies = homepageResponse.headers.getSetCookie();
    if (cookies && cookies.length > 0) {
      baseHeaders['cookie'] = cookies.join('; ');
    }

    return baseHeaders;
  } catch (error) {
    console.error("Error fetching NSE headers:", error);
    throw error;
  }
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

    // Get headers first
    const headers = await getNSEHeaders();
      
    // Fetch indices with proper headers
    const response = await customFetch(
      NSE_ENDPOINTS.INDICES,
      { 
        headers,
        method: 'GET'
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch indices: ${response.status}`);
    }

    const indices: AllIndices[] = await response.json();
    cache.set(cacheKey, indices);
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

  // const headers = await getNSEHeaders({ symbol });
  const bidDetails = await customFetch(
    `https://www.nseindia.com/api/ipo-detail?symbol=${symbol}&series=EQ`
    // { headers }
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

// import { Context } from "hono";
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
  const baseHeaders: Record<string, string> = {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "sec-ch-ua":
      '"Not_A Brand";v="99", "Google Chrome";v="120", "Chromium";v="120"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
  };

  try {
    // First hit the main page to get cookies
    const mainPageResponse = await fetch(
      "https://www.nseindia.com/get-quotes/derivatives?symbol=NIFTY",
      {
        headers: baseHeaders,
        redirect: "follow",
      }
    );

    if (!mainPageResponse.ok) {
      throw new Error(`Failed to access NSE: ${mainPageResponse.status}`);
    }

    const cookies = mainPageResponse.headers.get("set-cookie");
    if (cookies) {
      baseHeaders["cookie"] = cookies;
    }

    // Add referer after getting cookies
    baseHeaders["referer"] =
      "https://www.nseindia.com/get-quotes/derivatives?symbol=NIFTY";

    return baseHeaders;
  } catch (error) {
    console.error("Error fetching NSE headers:", error);
    throw error;
  }
};

export const getStockPrice = async (symbol: string): Promise<Response> => {
  try {
    const headers = await getNSEHeaders();
    const response = await customFetch(
      `${NSE_ENDPOINTS.QUOTE}?symbol=${symbol}`,
      { headers }
    );
    
    const price: StockPrice = await response.json();
    return new Response(JSON.stringify(price), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: true, 
      message: error instanceof Error ? error.message : 'Internal Server Error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
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

export const getAllIndices = async (): Promise<Response> => {
  try {
    const cacheKey = 'market:indices';
    const cached = cache.get(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const headers = await getNSEHeaders();
    console.log('Headers:', headers);
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));

    const response = await fetch('https://www.nseindia.com/api/allIndices', {
      method: 'GET',
      headers: {
        ...headers,
        'Origin': 'https://www.nseindia.com',
        'Referer': 'https://www.nseindia.com/get-quotes/derivatives?symbol=NIFTY'
      },
      redirect: 'follow'
    });
    console.log('Response:', response);

    if (!response.ok) {
      throw new Error(`Failed to fetch indices: ${response.status}`);
    }

    const data = await response.json();
    
    const indices: AllIndices[] = data.data?.map((index: any) => ({
      indexSymbol: index.indexSymbol || index.symbol || '',
      indexName: index.indexName || index.name || '',
      last: index.last || index.lastPrice || 0,
      percentChange: index.percentChange || index.change || 0,
      variation: index.variation || index.value || 0,
      timestamp: new Date().toISOString()
    })) || [];

    cache.set(cacheKey, indices, 5 * 60);
    
    return new Response(JSON.stringify(indices), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error in getAllIndices:', error);
    return new Response(JSON.stringify({ 
      error: true, 
      message: error instanceof Error ? error.message : 'Internal Server Error',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

export const getIpoDetails = async (symbol: string): Promise<Response> => {
  try {
    const cacheKey = `stock:${symbol}:ipo`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const headers = await getNSEHeaders();
    const bidDetails = await customFetch(
      `https://www.nseindia.com/api/ipo-detail?symbol=${symbol}&series=EQ`,
      { headers }
    );

    const ipoDetails: IpoDetails = await bidDetails.json();
    cache.set(cacheKey, ipoDetails);
    return new Response(JSON.stringify(ipoDetails), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: true, 
      message: error instanceof Error ? error.message : 'Internal Server Error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
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

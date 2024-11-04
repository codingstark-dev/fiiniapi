import { Elysia } from "elysia";
import { cache } from "../utils/cache";
import { fetchWithRetry } from "../utils/fetch";
import { NSE_ENDPOINTS, BSE_ENDPOINTS } from "../config/endpoints";
import type {
  StockPrice,
  MarketMovers,
  CorporateInfo,
  //   IPODetails,
  //   BoardMember,
  //   StockAnalysis,
  AllIndices,
  IpoDetails,
} from "../types";

const getNSEHeaders = async ({ symbol }: { symbol: string }) => {
  const headers: Record<string, string> = {
    accept: "*/*",
    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
    dnt: "1",
    referer: `https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`,
    "sec-ch-ua": '"Not?A_Brand";v="99", "Chromium";v="130"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  };

  const homepageResponse = await fetch("https://www.nseindia.com/");

  const homepageCookies =
    homepageResponse.headers.get("set-cookie")?.split(",") || [];
  if (homepageCookies) {
    headers["cookie"] = homepageCookies.join("; ");
  }

  return headers;
};

export const getStockPrice = async ({
  params: { symbol },
}: {
  params: { symbol: string };
}) => {
  const cacheKey = `price:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const headers = await getNSEHeaders({ symbol });
  const response = await fetchWithRetry(
    `${NSE_ENDPOINTS.QUOTE}?symbol=${symbol}`,
    { headers }
  );

  const price: StockPrice = await response.json();
  cache.set(cacheKey, price); // Cache for 1 minute
  return price;
};

export const getMarketMovers = async () => {
  const cacheKey = "market:movers";
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const headers = await getNSEHeaders({ symbol: "NIFTY" });
  const [gainers, losers] = await Promise.all([
    fetchWithRetry(NSE_ENDPOINTS.GAINERS, { headers }),
    fetchWithRetry(NSE_ENDPOINTS.LOSERS, { headers }),
  ]);

  const movers: MarketMovers = {
    gainers: await gainers.json(),
    losers: await losers.json(),
  };

  cache.set(cacheKey, movers); // Cache for 5 minutes
  return movers;
};

export const getAllIndices = async () => {
  const cacheKey = "market:indices";
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const headers = await getNSEHeaders({ symbol: "NIFTY" });

  const response = await fetchWithRetry(NSE_ENDPOINTS.INDICES, { headers });
  const indices: AllIndices[] = await response.json();
  cache.set(cacheKey, indices); //
  return indices;
};
export const getIpoDetails = async (symbol: string) => {
  const cacheKey = `stock:${symbol}:ipo`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const headers = await getNSEHeaders({ symbol });
  const bidDetails = await fetchWithRetry(
    `https://www.nseindia.com/api/ipo-detail?symbol=${symbol}&series=EQ`,
    { headers }
  );

  const ipoDetails: IpoDetails = await bidDetails.json();
  cache.set(cacheKey, ipoDetails);
  return ipoDetails;
};

export const getCorporateInfo = async (symbol: string, infoType: string) => {
  const cacheKey = `companyDetails-${symbol}`;
//   const cached = cache.get(cacheKey);
//   if (cached) return cached;

  const headers = await getNSEHeaders({ symbol });
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

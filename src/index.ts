import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getStockPrice, 
  
  // getMarketMovers, getAllIndices, getIpoDetails, getCorporateInfo 
} from './controllers/stock';
import { errorHandler } from './middleware/error';
import { setupCache } from './utils/cache';
import { getRouterName, showRoutes } from "hono/dev";
import { handle } from "@hono/node-server/vercel";

export const runtime = "edge";

// Initialize cache
setupCache();

// Create Elysia app
const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: "NSE Stock API",
          version: "1.0.0",
        },
      },
    })
  )
  .use(cors())
  // .use(
  //   rateLimit({
  //     max: 100,
  //     // window: "1m",
  //   })
  // )
  .use(ErrorHandler)
  .group("/api", (app) =>
    app
      .get("/stock/:symbol/price", getStockPrice)
      .get("/market/movers", getMarketMovers)
      .get("/market/indices", getAllIndices)
      .get("/stock/:symbol/ipo", getIpoDetails)
      // .get("/ipo/current", getCurrentIpos)
      // .get("/ipo/past", getPastIpos)
      // .get("/stock/:symbol/board", getBoardMembers)
      // .get("/stock/:symbol/annual-report", getAnnualReport)
      // .get("/stock/:symbol/news", getStockNews)
      // .get("/stock/:symbol/analysis", analyzeStock)
      .get("/stock/:symbol/corporate/:type", getCorporateInfo)
  )
  .listen(3002);

console.log(
  `🦊 NSE Scraper running at https://${app.server?.hostname}:${app.server?.port}`
);

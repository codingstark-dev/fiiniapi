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

// Create Hono app
const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', errorHandler);
app.get('/', (c) => {
  return c.json({ message: 'Welcome to the Stock API' });
})
// Routes
app.get('/api/stock/:symbol/price', getStockPrice);
// app.get('/api/market/movers', getMarketMovers);
// app.get('/api/market/indices', getAllIndices);
// app.get('/api/stock/:symbol/ipo', getIpoDetails);
// app.get('/api/stock/:symbol/corporate/:type', getCorporateInfo);
showRoutes(
  app,{
    verbose: true,
    colorize: true,
  }
)
// export default {
//   port: 3002,
//   fetch: app.fetch,
// };
export const GET = handle(app,);
export const POST = handle(app);
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from './utils/cache';
import { getStockPrice,
getAllIndices,
getCorporateInfo,
getIpoDetails,
getMarketMovers,



 } from './controllers/stock';
import { errorHandler } from './middleware/error';
import { timeoutMiddleware } from './middleware/timeout';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', errorHandler);
app.use('*', timeoutMiddleware);

// Routes
app.get('/', (c) => c.json({ message: 'Welcome to the Stock API' }));
app.get('/api/stock/:symbol/price', getStockPrice);
//localhost:8787/api/stock/:symbol/ipo
app.get('/api/stock/:symbol/ipo', getIpoDetails);
// http://localhost:3005/api/market/indices
app.get('/api/market/indices', getAllIndices);

export default app;
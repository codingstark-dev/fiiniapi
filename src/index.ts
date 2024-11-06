// import { handleCors } from './utils/cors';
import { 
  getStockPrice,
  getAllIndices,
  getIpoDetails
} from './controllers/stock';
import { ExecutionContext } from '@cloudflare/workers-types/experimental';
import { handleCors } from './utils/cors';

export interface Env {}

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  // Handle CORS
  if (request.method === 'OPTIONS') {
    return handleCors(request);
  }

  const url = new URL(request.url);
  
  try {
    // Route matching
    if (url.pathname === '/') {
      return new Response(JSON.stringify({ message: 'Welcome to the Stock API' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname.match(/^\/api\/stock\/[\w-]+\/price$/)) {
      const symbol = url.pathname.split('/')[3];
      return await getStockPrice(symbol);
    }

    if (url.pathname.match(/^\/api\/stock\/[\w-]+\/ipo$/)) {
      const symbol = url.pathname.split('/')[3];
      return await getIpoDetails(symbol);
    }

    if (url.pathname === '/api/market/indices') {
      return await getAllIndices();
    }

    return new Response('Not Found', { status: 404 });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: true, 
      message: error instanceof Error ? error.message : 'Internal Server Error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export default {
  fetch: handleRequest
};
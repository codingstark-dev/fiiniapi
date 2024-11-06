import { TimeoutError, withTimeout } from './timeout';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const customFetch = async (url: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<Response> => {
  const timeoutMs = 30000;
  
  const enhancedOptions: RequestInit = {
    ...options,
    headers: {
      ...options.headers,
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'DNT': '1',
      'Connection': 'keep-alive'
    },
    redirect: 'follow',
  };

  try {
    const response = await withTimeout(fetch(url, enhancedOptions), timeoutMs);
    
    if (!response.ok) {
      if (retries > 0 && [429, 503, 502, 500].includes(response.status)) {
        await sleep(RETRY_DELAY);
        return customFetch(url, options, retries - 1);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    if (error instanceof TimeoutError) {
      if (retries > 0) {
        await sleep(RETRY_DELAY);
        return customFetch(url, options, retries - 1);
      }
      throw new Error('Request timed out after multiple attempts');
    }
    throw error;
  }
};

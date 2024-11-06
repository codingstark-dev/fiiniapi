import { TimeoutError, withTimeout } from './timeout';

export const customFetch = async (url: string, options: RequestInit = {}) => {
  const timeoutMs = 30000; // 30 seconds timeout
  
  const enhancedOptions: RequestInit = {
    ...options,
    headers: {
      ...options.headers,
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    redirect: 'follow',
  };

  try {
    const response = await withTimeout(fetch(url, enhancedOptions), timeoutMs);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    if (error instanceof TimeoutError) {
      throw new Error('Request timed out. The server is taking too long to respond.');
    }
    throw error;
  }
};

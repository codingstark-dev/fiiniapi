export const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retries = 3
) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        // Add required headers for bypassing Cloudflare protection
        headers: {
          ...options.headers,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        // cf: {
        //   // Cloudflare specific options
        //   cacheTtl: 300, // 5 minutes cache
        //   cacheEverything: true
        // }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      
      if (i === retries - 1) throw error;
      
      // Exponential backoff
      const delay = 1000 * Math.pow(2, i);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Failed after ${retries} retries`);
};

import { Context, Next } from 'hono';
import { TimeoutError } from '../utils/timeout';

export const timeoutMiddleware = async (c: Context, next: Next) => {
  const timeoutMs = 30000; // 30 seconds
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new TimeoutError()), timeoutMs);
  });

  try {
    await Promise.race([next(), timeoutPromise]);
  } catch (error) {
    if (error instanceof TimeoutError) {
      return c.json({
        error: true,
        message: 'Request timed out',
        code: 504
      }, 504);
    }
    throw error;
  }
};

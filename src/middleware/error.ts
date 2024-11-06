import { Context, Next } from 'hono';

export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error: any) {
    console.error(`[ERROR]`, error);
    return c.json({
      error: true,
      message: error.message,
      code: error.status || 500,
    }, error.status || 500);
  }
};
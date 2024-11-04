import { Elysia } from "elysia";

export const ErrorHandler = new Elysia().onError(({ code, error, set }) => {
  console.error(`[${code}]`, error);

  set.status = code === "NOT_FOUND" ? 404 : 500;

  return {
    error: true,
    message: error.message,
    code,
  };
});

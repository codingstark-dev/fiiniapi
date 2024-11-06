var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-JTT1vT/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/utils/cache.ts
var Cache = class {
  cache;
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
  }
  get(key) {
    const item = this.cache.get(key);
    if (!item)
      return null;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
  set(key, value, ttl = 3e5) {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }
};
__name(Cache, "Cache");
var cache = new Cache();

// src/utils/timeout.ts
var TimeoutError = class extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "TimeoutError";
  }
};
__name(TimeoutError, "TimeoutError");
var withTimeout = /* @__PURE__ */ __name(async (promise, timeoutMs = 3e4) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new TimeoutError()), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}, "withTimeout");

// src/utils/custom-fetch.ts
var MAX_RETRIES = 3;
var RETRY_DELAY = 1e3;
var sleep = /* @__PURE__ */ __name((ms) => new Promise((resolve) => setTimeout(resolve, ms)), "sleep");
var customFetch = /* @__PURE__ */ __name(async (url, options = {}, retries = MAX_RETRIES) => {
  const timeoutMs = 3e4;
  const enhancedOptions = {
    ...options,
    headers: {
      ...options.headers,
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "DNT": "1",
      "Connection": "keep-alive"
    },
    redirect: "follow"
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
      throw new Error("Request timed out after multiple attempts");
    }
    throw error;
  }
}, "customFetch");

// src/config/endpoints.ts
var NSE_ENDPOINTS = {
  BASE: "https://www.nseindia.com",
  QUOTE: "https://www.nseindia.com/api/quote-equity",
  GAINERS: "https://www.nseindia.com/api/live-analysis-gainers",
  LOSERS: "https://www.nseindia.com/api/live-analysis-losers",
  IPO_CURRENT: "https://www.nseindia.com/api/ipo-current-issue",
  IPO_PAST: "https://www.nseindia.com/api/public-past-issues",
  INDICES: "https://www.nseindia.com/api/allIndices",
  CORPORATE_INFO: "https://www.nseindia.com/api/corporate-announcements"
};

// src/controllers/stock.ts
var getNSEHeaders = /* @__PURE__ */ __name(async () => {
  const baseHeaders = {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "sec-ch-ua": '"Not_A Brand";v="99", "Google Chrome";v="120", "Chromium";v="120"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin"
  };
  try {
    const mainPageResponse = await fetch(
      "https://www.nseindia.com/get-quotes/derivatives?symbol=NIFTY",
      {
        headers: baseHeaders,
        redirect: "follow"
      }
    );
    if (!mainPageResponse.ok) {
      throw new Error(`Failed to access NSE: ${mainPageResponse.status}`);
    }
    const cookies = mainPageResponse.headers.get("set-cookie");
    if (cookies) {
      baseHeaders["cookie"] = cookies;
    }
    baseHeaders["referer"] = "https://www.nseindia.com/get-quotes/derivatives?symbol=NIFTY";
    return baseHeaders;
  } catch (error) {
    console.error("Error fetching NSE headers:", error);
    throw error;
  }
}, "getNSEHeaders");
var getStockPrice = /* @__PURE__ */ __name(async (symbol) => {
  try {
    const headers = await getNSEHeaders();
    const response = await customFetch(
      `${NSE_ENDPOINTS.QUOTE}?symbol=${symbol}`,
      { headers }
    );
    const price = await response.json();
    return new Response(JSON.stringify(price), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: true,
      message: error instanceof Error ? error.message : "Internal Server Error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "getStockPrice");
var getAllIndices = /* @__PURE__ */ __name(async () => {
  try {
    const cacheKey = "market:indices";
    const cached = cache.get(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    const headers = await getNSEHeaders();
    console.log("Headers:", headers);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const response = await fetch("https://www.nseindia.com/api/allIndices", {
      method: "GET",
      headers: {
        ...headers,
        "Origin": "https://www.nseindia.com",
        "Referer": "https://www.nseindia.com/get-quotes/derivatives?symbol=NIFTY"
      },
      redirect: "follow"
    });
    console.log("Response:", response);
    if (!response.ok) {
      throw new Error(`Failed to fetch indices: ${response.status}`);
    }
    const data = await response.json();
    const indices = data.data?.map((index) => ({
      indexSymbol: index.indexSymbol || index.symbol || "",
      indexName: index.indexName || index.name || "",
      last: index.last || index.lastPrice || 0,
      percentChange: index.percentChange || index.change || 0,
      variation: index.variation || index.value || 0,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    })) || [];
    cache.set(cacheKey, indices, 5 * 60);
    return new Response(JSON.stringify(indices), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    console.error("Error in getAllIndices:", error);
    return new Response(JSON.stringify({
      error: true,
      message: error instanceof Error ? error.message : "Internal Server Error",
      details: error instanceof Error ? error.stack : void 0
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}, "getAllIndices");
var getIpoDetails = /* @__PURE__ */ __name(async (symbol) => {
  try {
    const cacheKey = `stock:${symbol}:ipo`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { "Content-Type": "application/json" }
      });
    }
    const headers = await getNSEHeaders();
    const bidDetails = await customFetch(
      `https://www.nseindia.com/api/ipo-detail?symbol=${symbol}&series=EQ`,
      { headers }
    );
    const ipoDetails = await bidDetails.json();
    cache.set(cacheKey, ipoDetails);
    return new Response(JSON.stringify(ipoDetails), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: true,
      message: error instanceof Error ? error.message : "Internal Server Error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "getIpoDetails");

// src/utils/cors.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
function handleCors(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  return new Response("Method not allowed", { status: 405 });
}
__name(handleCors, "handleCors");

// src/index.ts
async function handleRequest(request, env, ctx) {
  if (request.method === "OPTIONS") {
    return handleCors(request);
  }
  const url = new URL(request.url);
  try {
    if (url.pathname === "/") {
      return new Response(JSON.stringify({ message: "Welcome to the Stock API" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.pathname.match(/^\/api\/stock\/[\w-]+\/price$/)) {
      const symbol = url.pathname.split("/")[3];
      return await getStockPrice(symbol);
    }
    if (url.pathname.match(/^\/api\/stock\/[\w-]+\/ipo$/)) {
      const symbol = url.pathname.split("/")[3];
      return await getIpoDetails(symbol);
    }
    if (url.pathname === "/api/market/indices") {
      return await getAllIndices();
    }
    return new Response("Not Found", { status: 404 });
  } catch (error) {
    return new Response(JSON.stringify({
      error: true,
      message: error instanceof Error ? error.message : "Internal Server Error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleRequest, "handleRequest");
var src_default = {
  fetch: handleRequest
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-JTT1vT/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-JTT1vT/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map

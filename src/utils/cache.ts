import { LRUCache } from "lru-cache";

let cache: LRUCache<string, any>;

export const setupCache = () => {
  cache = new LRUCache({
    max: 500,
    ttl: 1000 * 60 * 5, // 5 minutes default TTL
  });
};

export { cache };

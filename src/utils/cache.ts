export class Cache {
  private cache: Map<string, { value: any; expires: number }>;

  constructor() {
    this.cache = new Map();
  }

  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key: string, value: any, ttl = 300000): void { // Default 5 minutes
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }
}

export const cache = new Cache();

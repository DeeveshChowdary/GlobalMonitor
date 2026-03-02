export type CacheValue<T> = {
  value: T;
  expiresAt: number;
  staleUntil: number;
  etag?: string;
};

export type CacheStore<T> = {
  get: (key: string) => Promise<CacheValue<T> | null>;
  set: (key: string, value: CacheValue<T>) => Promise<void>;
};

export type CacheContext = {
  waitUntil?: (promise: Promise<unknown>) => void;
};

export const now = () => Date.now();

export const buildCacheKey = (prefix: string, params: Record<string, string | undefined>) => {
  const normalized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
  return `${prefix}|${normalized}`;
};

export const safeJsonParse = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 8000
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const inMemory = new Map<string, CacheValue<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export const memoryCacheStore = <T>(): CacheStore<T> => ({
  get: async (key) => (inMemory.get(key) as CacheValue<T> | undefined) ?? null,
  set: async (key, value) => {
    inMemory.set(key, value as CacheValue<unknown>);
  }
});

export const createCachedFetcher = <T>(store: CacheStore<T>) => {
  const getCached = async (
    key: string,
    ttlMs: number,
    staleWhileRevalidateMs: number,
    fetcher: () => Promise<T>,
    context?: CacheContext
  ): Promise<{ value: T; cacheStatus: 'fresh' | 'stale' | 'miss' }> => {
    const current = await store.get(key);
    const timestamp = now();

    if (current && current.expiresAt > timestamp) {
      return { value: current.value, cacheStatus: 'fresh' };
    }

    if (current && current.staleUntil > timestamp) {
      const inFlightPromise = inFlight.get(key) as Promise<T> | undefined;
      if (!inFlightPromise) {
        const refreshPromise = fetcher()
          .then(async (value) => {
            const next: CacheValue<T> = {
              value,
              expiresAt: now() + ttlMs,
              staleUntil: now() + ttlMs + staleWhileRevalidateMs
            };
            await store.set(key, next);
            return value;
          })
          .catch(() => current.value)
          .finally(() => {
            inFlight.delete(key);
          });

        inFlight.set(key, refreshPromise);
        context?.waitUntil?.(refreshPromise);
      }

      return { value: current.value, cacheStatus: 'stale' };
    }

    const existing = inFlight.get(key) as Promise<T> | undefined;
    if (existing) {
      const value = await existing;
      return { value, cacheStatus: 'miss' };
    }

    const promise = fetcher()
      .then(async (value) => {
        const next: CacheValue<T> = {
          value,
          expiresAt: now() + ttlMs,
          staleUntil: now() + ttlMs + staleWhileRevalidateMs
        };
        await store.set(key, next);
        return value;
      })
      .finally(() => {
        inFlight.delete(key);
      });

    inFlight.set(key, promise);

    try {
      const value = await promise;
      return { value, cacheStatus: 'miss' };
    } catch (error) {
      if (current) {
        return { value: current.value, cacheStatus: 'stale' };
      }
      throw error;
    }
  };

  return {
    getCached
  };
};

export const hashValue = (input: string) => {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  return `W/\"${(hash >>> 0).toString(16)}\"`;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const mean = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((acc, value) => acc + value, 0) / values.length;

export const stdDev = (values: number[]) => {
  if (values.length < 2) {
    return 0;
  }
  const avg = mean(values);
  const variance = mean(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
};

export const toIso = (input: Date | string | number) => new Date(input).toISOString();

export const parseCsv = (csv: string) => {
  const [headerLine, ...rows] = csv.trim().split('\n');
  const headers = headerLine.split(',').map((value) => value.trim());
  return rows
    .filter((line) => line.trim().length > 0)
    .map((row) => {
      const cells = row.split(',');
      return headers.reduce<Record<string, string>>((acc, header, index) => {
        acc[header] = (cells[index] ?? '').trim();
        return acc;
      }, {});
    });
};

export const groupByDay = <T extends { timestamp: string }>(items: T[]) => {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const day = item.timestamp.slice(0, 10);
    const list = grouped.get(day) ?? [];
    list.push(item);
    grouped.set(day, list);
  }
  return grouped;
};

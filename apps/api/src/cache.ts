import { createCachedFetcher, hashValue, memoryCacheStore, now, safeJsonParse, type CacheStore, type CacheValue } from '@gm/utils';
import type { Context } from 'hono';
import type { EnvBindings } from './types';

const memoryStore = memoryCacheStore<unknown>();

const combinedStore = <T>(env: EnvBindings): CacheStore<T> => ({
  get: async (key) => {
    const memory = (await memoryStore.get(key)) as CacheValue<T> | null;
    if (memory) {
      return memory;
    }

    if (!env.CACHE_KV) {
      return null;
    }

    const raw = await env.CACHE_KV.get(key);
    if (!raw) {
      return null;
    }
    const parsed = safeJsonParse<CacheValue<T>>(raw);
    if (!parsed) {
      return null;
    }
    await memoryStore.set(key, parsed as CacheValue<unknown>);
    return parsed;
  },
  set: async (key, value) => {
    await memoryStore.set(key, value as CacheValue<unknown>);
    if (!env.CACHE_KV) {
      return;
    }

    const ttl = Math.max(60, Math.floor((value.staleUntil - now()) / 1000));
    await env.CACHE_KV.put(key, JSON.stringify(value), { expirationTtl: ttl });
  }
});

export const getCached = async <T>(
  env: EnvBindings,
  key: string,
  ttlMs: number,
  staleMs: number,
  fetcher: () => Promise<T>,
  c: Context
) => {
  const cache = createCachedFetcher(combinedStore<T>(env));
  return cache.getCached(key, ttlMs, staleMs, fetcher, {
    waitUntil: (promise) => c.executionCtx.waitUntil(Promise.resolve(promise))
  });
};

export const respondJsonWithCache = <T>(
  c: Context,
  payload: T,
  cacheStatus: 'fresh' | 'stale' | 'miss',
  maxAgeSeconds = 60,
  staleSeconds = 300
) => {
  const body = JSON.stringify(payload);
  const etag = hashValue(body);
  if (c.req.header('if-none-match') === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleSeconds}`,
        'X-Cache-Status': cacheStatus
      }
    });
  }

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ETag: etag,
      'Cache-Control': `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleSeconds}`,
      'X-Cache-Status': cacheStatus
    }
  });
};

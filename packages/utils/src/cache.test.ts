import { describe, expect, it } from 'vitest';
import { createCachedFetcher, memoryCacheStore } from './index';

describe('createCachedFetcher', () => {
  it('deduplicates in-flight requests for the same key', async () => {
    const store = memoryCacheStore<number>();
    const fetcher = createCachedFetcher(store);

    let upstreamCalls = 0;
    const load = async () => {
      upstreamCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 25));
      return 42;
    };

    const [first, second, third] = await Promise.all([
      fetcher.getCached('same-key', 1000, 1000, load),
      fetcher.getCached('same-key', 1000, 1000, load),
      fetcher.getCached('same-key', 1000, 1000, load)
    ]);

    expect(first.value).toBe(42);
    expect(second.value).toBe(42);
    expect(third.value).toBe(42);
    expect(upstreamCalls).toBe(1);
  });

  it('falls back to stale value when refresh fails', async () => {
    const store = memoryCacheStore<number>();
    const fetcher = createCachedFetcher(store);

    await fetcher.getCached('stale-key', 5, 5000, async () => 7);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const result = await fetcher.getCached('stale-key', 5, 5000, async () => {
      throw new Error('upstream failed');
    });

    expect(result.value).toBe(7);
    expect(result.cacheStatus).toBe('stale');
  });
});

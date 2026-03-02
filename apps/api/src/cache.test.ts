import { describe, expect, it } from 'vitest';
import { respondJsonWithCache } from './cache';

const makeContext = (ifNoneMatch?: string) =>
  ({
    req: {
      header: (name: string) => {
        if (name.toLowerCase() === 'if-none-match') {
          return ifNoneMatch;
        }
        return undefined;
      }
    }
  }) as any;

describe('respondJsonWithCache', () => {
  it('adds ETag and Cache-Control headers', () => {
    const response = respondJsonWithCache(makeContext(), { version: 'v1', generatedAt: '', data: [] }, 'miss');

    expect(response.headers.get('ETag')).toBeTruthy();
    expect(response.headers.get('Cache-Control')).toContain('stale-while-revalidate');
    expect(response.headers.get('X-Cache-Status')).toBe('miss');
  });

  it('returns 304 when If-None-Match matches ETag', () => {
    const first = respondJsonWithCache(makeContext(), { version: 'v1', generatedAt: '', data: [1] }, 'fresh');
    const etag = first.headers.get('ETag') ?? '';

    const second = respondJsonWithCache(
      makeContext(etag),
      { version: 'v1', generatedAt: '', data: [1] },
      'fresh'
    );

    expect(second.status).toBe(304);
  });
});

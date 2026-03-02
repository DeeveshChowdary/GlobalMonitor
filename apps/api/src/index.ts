import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { buildCacheKey } from '@gm/utils';
import type { ModuleId, TimeRange } from '@gm/schema';
import type { EnvBindings } from './types';
import { getCached, respondJsonWithCache } from './cache';
import {
  buildEventsResponse,
  buildSignalsResponse,
  buildTimeseriesResponse,
  validateModuleQuery
} from './services/module-data';

const app = new Hono<{ Bindings: EnvBindings }>();

app.use('/api/*', cors());

app.get('/api/health', (c) => {
  const payload = {
    version: 'v1',
    generatedAt: new Date().toISOString(),
    data: {
      status: 'ok',
      runtime: 'cloudflare-worker',
      modules: ['global-risk', 'financial-stress', 'capital-flows', 'ai-tech']
    }
  };

  return respondJsonWithCache(c, payload, 'fresh', 15, 30);
});

app.get('/api/signals', async (c) => {
  try {
    const module = c.req.query('module') ?? 'global-risk';
    const timeRange = c.req.query('timeRange') ?? '7d';
    const parsed = validateModuleQuery(module, timeRange);
    const key = buildCacheKey('signals', parsed);

    const result = await getCached(
      c.env,
      key,
      60 * 1000,
      5 * 60 * 1000,
      () => buildSignalsResponse(parsed.module as ModuleId, parsed.timeRange as TimeRange, c.env),
      c
    );

    return respondJsonWithCache(c, result.value, result.cacheStatus, 60, 300);
  } catch (error) {
    return c.json(
      {
        version: 'v1',
        generatedAt: new Date().toISOString(),
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      400
    );
  }
});

app.get('/api/events', async (c) => {
  try {
    const module = c.req.query('module') ?? 'global-risk';
    const timeRange = c.req.query('timeRange') ?? '7d';
    const parsed = validateModuleQuery(module, timeRange);
    const key = buildCacheKey('events', parsed);

    const result = await getCached(
      c.env,
      key,
      60 * 1000,
      5 * 60 * 1000,
      () => buildEventsResponse(parsed.module as ModuleId, parsed.timeRange as TimeRange, c.env),
      c
    );

    return respondJsonWithCache(c, result.value, result.cacheStatus, 60, 300);
  } catch (error) {
    return c.json(
      {
        version: 'v1',
        generatedAt: new Date().toISOString(),
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      400
    );
  }
});

app.get('/api/timeseries', async (c) => {
  try {
    const module = c.req.query('module') ?? 'global-risk';
    const timeRange = c.req.query('timeRange') ?? '30d';
    const metric = c.req.query('metric') ?? undefined;
    const parsed = validateModuleQuery(module, timeRange);

    const key = buildCacheKey('timeseries', {
      module: parsed.module,
      timeRange: parsed.timeRange,
      metric
    });

    const result = await getCached(
      c.env,
      key,
      2 * 60 * 1000,
      10 * 60 * 1000,
      () => buildTimeseriesResponse(parsed.module as ModuleId, parsed.timeRange as TimeRange, metric, c.env),
      c
    );

    return respondJsonWithCache(c, result.value, result.cacheStatus, 120, 600);
  } catch (error) {
    return c.json(
      {
        version: 'v1',
        generatedAt: new Date().toISOString(),
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      400
    );
  }
});

export default app;

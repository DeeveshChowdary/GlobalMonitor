import type { Event, ModuleId, Signal, TimeRange, Timeseries } from '@gm/schema';

const rangeDays: Record<TimeRange, number> = {
  '24h': 2,
  '7d': 8,
  '30d': 31,
  '90d': 91
};

const templates: Record<
  ModuleId,
  Array<{ metricId: string; label: string; unit: string; base: number; amplitude: number; tags: string[] }>
> = {
  'global-risk': [
    {
      metricId: 'global-risk-score',
      label: 'Global Risk Composite',
      unit: 'score',
      base: 58,
      amplitude: 9,
      tags: ['composite']
    }
  ],
  'financial-stress': [
    { metricId: 'yield-spread', label: '10Y - 2Y Yield Spread', unit: '%', base: -0.2, amplitude: 0.6, tags: ['rates'] },
    { metricId: 'cpi', label: 'US CPI Index', unit: 'index', base: 310, amplitude: 8, tags: ['inflation'] },
    { metricId: 'unemployment', label: 'US Unemployment Rate', unit: '%', base: 4.2, amplitude: 0.5, tags: ['labor'] },
    { metricId: 'credit-spread-proxy', label: 'BAA - 10Y Spread Proxy', unit: '%', base: 2.4, amplitude: 0.7, tags: ['credit'] }
  ],
  'capital-flows': [
    { metricId: 'btc-price', label: 'BTC Price', unit: 'USD', base: 91000, amplitude: 8200, tags: ['crypto'] },
    { metricId: 'eth-price', label: 'ETH Price', unit: 'USD', base: 5000, amplitude: 520, tags: ['crypto'] },
    {
      metricId: 'stablecoin-total-market-cap',
      label: 'Stablecoin Total Market Cap',
      unit: 'USD',
      base: 190_000_000_000,
      amplitude: 7_500_000_000,
      tags: ['stablecoin']
    }
  ],
  'ai-tech': [
    {
      metricId: 'arxiv-publication-rate',
      label: 'arXiv AI Paper Velocity',
      unit: 'count/day',
      base: 32,
      amplitude: 8,
      tags: ['research']
    },
    {
      metricId: 'github-release-rate',
      label: 'GitHub Release Velocity',
      unit: 'count/day',
      base: 14,
      amplitude: 5,
      tags: ['software']
    }
  ]
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const seedFrom = (text: string) => {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
};

const makePoints = (days: number, base: number, amplitude: number, seed: number) => {
  const points: Array<{ timestamp: string; value: number }> = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(Date.now() - index * 24 * 60 * 60 * 1000);
    const wave = Math.sin((days - index + (seed % 11)) / 4.5) * amplitude;
    const drift = ((seed % 7) - 3) * (amplitude / 40);
    const jitter = ((seed * (days - index + 3)) % 17) / 17 - 0.5;
    points.push({
      timestamp: day.toISOString(),
      value: base + wave + drift + jitter * (amplitude / 8)
    });
  }
  return points;
};

const buildSignals = (module: ModuleId, series: Timeseries[]): Signal[] =>
  series.map((metric) => {
    const latest = metric.points[metric.points.length - 1]?.value ?? 0;
    const lookback = metric.points[Math.max(0, metric.points.length - 8)]?.value ?? latest;
    const delta = latest - lookback;
    const normalized = metric.metricId.includes('yield-spread') ? -delta : Math.abs(delta);
    const severity = clamp(42 + Math.abs(normalized) * 7, 18, 92);
    const acceleration = clamp(delta * 2.5, -20, 20);
    const confidence = 35;

    return {
      id: `${module}:fallback:${metric.metricId}`,
      module,
      title: `${metric.label} (offline fallback)`,
      description:
        'Generated placeholder monitor while live upstream sources are unavailable. Refresh will auto-recover live data.',
      timestamp: metric.points[metric.points.length - 1]?.timestamp ?? new Date().toISOString(),
      severity,
      acceleration,
      confidence,
      score: clamp(severity * 0.7 + acceleration * 0.3, 0, 100),
      metricIds: [metric.metricId],
      relatedEventIds: [],
      tags: [...metric.tags, 'degraded'],
      region: 'Global',
      sourceRefs: ['Synthetic fallback']
    } satisfies Signal;
  });

const buildEvents = (module: ModuleId, signals: Signal[]): Event[] => {
  const now = Date.now();
  const events = signals.slice(0, 8).map((signal, index) => ({
    id: `${module}:fallback:event:${signal.metricIds[0]}:${index}`,
    module,
    title: `${signal.title} update`,
    summary:
      'Using deterministic fallback event because upstream source timed out or returned no data.',
    timestamp: new Date(now - index * 2 * 60 * 60 * 1000).toISOString(),
    source: 'system-fallback',
    tags: ['degraded', ...signal.tags],
    severity: signal.severity
  })) satisfies Event[];

  events.unshift({
    id: `${module}:fallback:status`,
    module,
    title: 'Live data temporarily unavailable',
    summary: 'Dashboard switched to local fallback mode. Data refresh continues automatically.',
    timestamp: new Date().toISOString(),
    source: 'system-fallback',
    tags: ['status', 'degraded'],
    severity: 28
  });

  return events;
};

export const buildFallbackBundle = (module: ModuleId, timeRange: TimeRange) => {
  const days = rangeDays[timeRange];
  const metricTemplates = templates[module];

  const timeseries: Timeseries[] = metricTemplates.map((template) => {
    const seed = seedFrom(`${module}:${template.metricId}:${timeRange}`);
    return {
      id: `${module}:fallback:${template.metricId}`,
      module,
      metricId: template.metricId,
      label: template.label,
      unit: template.unit,
      source: 'Synthetic fallback',
      points: makePoints(days, template.base, template.amplitude, seed),
      tags: [...template.tags, 'degraded']
    };
  });

  const signals = buildSignals(module, timeseries).sort((left, right) => right.score - left.score);
  const events = buildEvents(module, signals);

  return {
    signals,
    events,
    timeseries
  };
};


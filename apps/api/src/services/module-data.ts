import type { ModuleId, Signal, TimeRange, Timeseries, Event, ApiEnvelope } from '@gm/schema';
import {
  eventsResponseSchema,
  moduleConfigs,
  signalsResponseSchema,
  timeseriesResponseSchema,
  isModuleId,
  isTimeRange
} from '@gm/schema';
import {
  getAiTechEvents,
  getAiTechTimeseriesFromEvents,
  getCapitalFlowEvents,
  getCapitalFlowTimeseries,
  filterByRange,
  getFinancialEvents,
  getFinancialTimeseries,
  type SourceEnv
} from '@gm/sources';
import {
  globalRiskBlend,
  rankSignals,
  rollingZScore,
  sigmoidSeverity,
  signalFromTimeseries,
  type MetricSignalConfig
} from '@gm/scoring';
import { clamp, mean } from '@gm/utils';

const metricSignalConfigs: Record<Exclude<ModuleId, 'global-risk'>, MetricSignalConfig[]> = {
  'financial-stress': [
    {
      module: 'financial-stress',
      metricId: 'yield-spread',
      title: 'Yield Curve Inversion Stress',
      description: '10Y-2Y spread compressed/inverted relative to rolling history.',
      invert: true,
      tags: ['macro', 'rates', 'inversion'],
      region: 'North America',
      country: 'US'
    },
    {
      module: 'financial-stress',
      metricId: 'cpi',
      title: 'Inflation Re-acceleration',
      description: 'CPI level is elevated versus trailing distribution.',
      tags: ['inflation', 'macro'],
      region: 'North America',
      country: 'US'
    },
    {
      module: 'financial-stress',
      metricId: 'unemployment',
      title: 'Labor Market Weakening',
      description: 'Unemployment is rising relative to prior trend.',
      tags: ['labor', 'macro'],
      region: 'North America',
      country: 'US'
    },
    {
      module: 'financial-stress',
      metricId: 'credit-spread-proxy',
      title: 'Credit Stress Proxy',
      description: 'Corporate spread proxy has widened from rolling baseline.',
      tags: ['credit'],
      region: 'North America',
      country: 'US'
    },
    {
      module: 'financial-stress',
      metricId: 'us10y',
      title: 'Long-End Rate Pressure',
      description: '10Y yield deviation from historical baseline.',
      tags: ['rates'],
      region: 'North America',
      country: 'US'
    }
  ],
  'capital-flows': [
    {
      module: 'capital-flows',
      metricId: 'btc-price',
      title: 'BTC Momentum Regime',
      description: 'BTC price deviation signals risk appetite rotation.',
      tags: ['crypto', 'risk-on'],
      region: 'Global'
    },
    {
      module: 'capital-flows',
      metricId: 'eth-price',
      title: 'ETH Beta Regime',
      description: 'ETH price acceleration proxy for speculative beta.',
      tags: ['crypto', 'risk-on'],
      region: 'Global'
    },
    {
      module: 'capital-flows',
      metricId: 'stablecoin-total-market-cap',
      title: 'Stablecoin Expansion',
      description: 'Combined USDT+USDC market cap trend as a flow proxy.',
      tags: ['stablecoin', 'liquidity'],
      region: 'Global'
    },
    {
      module: 'capital-flows',
      metricId: 'btc-volatility-proxy',
      title: 'Volatility Regime Shift',
      description: 'BTC realized volatility moved sharply from baseline.',
      tags: ['volatility'],
      region: 'Global'
    }
  ],
  'ai-tech': [
    {
      module: 'ai-tech',
      metricId: 'arxiv-publication-rate',
      title: 'Major Paper Trend',
      description: 'arXiv AI publication velocity changed versus recent baseline.',
      tags: ['research'],
      region: 'Global'
    },
    {
      module: 'ai-tech',
      metricId: 'github-release-rate',
      title: 'Release Surge',
      description: 'Open-source release frequency accelerated.',
      tags: ['software'],
      region: 'Global'
    }
  ]
};

const toEnvelope = <T>(data: T): ApiEnvelope<T> => ({
  version: 'v1',
  generatedAt: new Date().toISOString(),
  data
});

const alignByLength = (left: Timeseries, right: Timeseries) => {
  const length = Math.min(left.points.length, right.points.length);
  return Array.from({ length }, (_, index) => ({ left: left.points[index], right: right.points[index] }));
};

const deriveCapitalTimeseries = (series: Timeseries[]) => {
  const byMetric = Object.fromEntries(series.map((value) => [value.metricId, value]));
  const usdt = byMetric['usdt-market-cap'];
  const usdc = byMetric['usdc-market-cap'];
  const btc = byMetric['btc-price'];

  const derived: Timeseries[] = [];

  if (usdt && usdc) {
    const totalPoints = alignByLength(usdt, usdc).map((pair) => ({
      timestamp: pair.left.timestamp,
      value: pair.left.value + pair.right.value
    }));

    derived.push({
      id: 'capital-flows:stablecoin-total-market-cap',
      module: 'capital-flows',
      metricId: 'stablecoin-total-market-cap',
      label: 'Stablecoin Total Market Cap',
      source: 'Derived(CoinGecko)',
      unit: 'USD',
      points: totalPoints,
      tags: ['stablecoin', 'liquidity']
    });
  }

  if (btc && btc.points.length > 7) {
    const returns = btc.points.map((point, index) => {
      if (index === 0) {
        return { timestamp: point.timestamp, value: 0 };
      }
      const previous = btc.points[index - 1]?.value ?? point.value;
      return {
        timestamp: point.timestamp,
        value: ((point.value - previous) / (previous || 1)) * 100
      };
    });

    const volatilityPoints = returns.map((point, index) => {
      const window = returns.slice(Math.max(0, index - 6), index + 1).map((entry) => entry.value);
      const avg = mean(window);
      const variance = mean(window.map((value) => (value - avg) ** 2));
      return {
        timestamp: point.timestamp,
        value: Math.sqrt(variance)
      };
    });

    derived.push({
      id: 'capital-flows:btc-volatility-proxy',
      module: 'capital-flows',
      metricId: 'btc-volatility-proxy',
      label: 'BTC 7D Realized Volatility Proxy',
      source: 'Derived(CoinGecko)',
      unit: '%',
      points: volatilityPoints,
      tags: ['volatility']
    });
  }

  return [...series, ...derived];
};

const filterTimeseriesByRange = (series: Timeseries[], timeRange: TimeRange) =>
  series.map((metric) => ({
    ...metric,
    points: filterByRange(metric.points, timeRange)
  }));

const buildSignals = (module: Exclude<ModuleId, 'global-risk'>, timeseries: Timeseries[]) => {
  const configs = metricSignalConfigs[module];
  const byMetric = Object.fromEntries(timeseries.map((series) => [series.metricId, series]));

  const signals = configs
    .map((config) => {
      const series = byMetric[config.metricId];
      if (!series) {
        return null;
      }
      return signalFromTimeseries(series, config);
    })
    .filter((value): value is Signal => Boolean(value));

  return rankSignals(signals);
};

const severityPointsFromTimeseries = (series: Timeseries, invert = false) => {
  const values = series.points.map((point) => point.value);
  const z = rollingZScore(values, Math.min(252, values.length));
  return series.points.map((point, index) => {
    const score = sigmoidSeverity(invert ? -z[index] : z[index]);
    return { timestamp: point.timestamp.slice(0, 10), value: score };
  });
};

const blendGlobalTimeseries = (moduleSeries: Timeseries[]) => {
  const severityPoints = moduleSeries.flatMap((series) =>
    severityPointsFromTimeseries(series, series.metricId === 'yield-spread')
  );

  const grouped = new Map<string, number[]>();
  for (const point of severityPoints) {
    const existing = grouped.get(point.timestamp) ?? [];
    existing.push(point.value);
    grouped.set(point.timestamp, existing);
  }

  const points = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([day, scores]) => ({ timestamp: `${day}T00:00:00.000Z`, value: clamp(mean(scores), 0, 100) }));

  return {
    id: 'global-risk:global-risk-score',
    module: 'global-risk' as const,
    metricId: 'global-risk-score',
    label: 'Global Risk Score',
    source: 'Derived(blended)',
    unit: 'score',
    points,
    tags: ['composite']
  } satisfies Timeseries;
};

export const getModulePayload = async (module: ModuleId, timeRange: TimeRange, env: SourceEnv) => {
  if (module === 'financial-stress') {
    const fullTimeseries = await getFinancialTimeseries(env);
    const events = await getFinancialEvents(timeRange);
    const signals = buildSignals('financial-stress', fullTimeseries);
    const timeseries = filterTimeseriesByRange(fullTimeseries, timeRange);
    return { timeseries, events, signals };
  }

  if (module === 'capital-flows') {
    const base = await getCapitalFlowTimeseries(365);
    const timeseries = deriveCapitalTimeseries(base);
    const events = await getCapitalFlowEvents(timeRange, timeseries);
    const signals = buildSignals('capital-flows', timeseries);
    const ranged = filterTimeseriesByRange(timeseries, timeRange);
    return { timeseries: ranged, events, signals };
  }

  if (module === 'ai-tech') {
    const fullEvents = await getAiTechEvents('90d', env);
    const fullTimeseries = getAiTechTimeseriesFromEvents(fullEvents);
    const signals = buildSignals('ai-tech', fullTimeseries);
    const events = filterByRange(fullEvents, timeRange);
    const timeseries = filterTimeseriesByRange(fullTimeseries, timeRange);
    return { timeseries, events, signals };
  }

  const [financialFull, capitalBase, aiEventsFull] = await Promise.all([
    getFinancialTimeseries(env),
    getCapitalFlowTimeseries(365),
    getAiTechEvents('90d', env)
  ]);
  const capitalFull = deriveCapitalTimeseries(capitalBase);
  const aiFull = getAiTechTimeseriesFromEvents(aiEventsFull);

  const financialSignals = buildSignals('financial-stress', financialFull);
  const capitalSignals = buildSignals('capital-flows', capitalFull);
  const aiSignals = buildSignals('ai-tech', aiFull);

  const blend = globalRiskBlend([
    { module: 'financial-stress', signals: financialSignals },
    { module: 'capital-flows', signals: capitalSignals },
    { module: 'ai-tech', signals: aiSignals }
  ]);

  const globalSignal: Signal = {
    id: 'global-risk:composite-score',
    module: 'global-risk',
    title: 'Global Risk Composite',
    description: 'Weighted blend of Financial Stress, Capital Flows, and AI & Tech signals.',
    timestamp: new Date().toISOString(),
    severity: blend.score,
    acceleration: clamp(
      mean(blend.topSignals.slice(0, 8).map((signal) => signal.acceleration || 0)),
      -100,
      100
    ),
    confidence: clamp(mean(blend.topSignals.slice(0, 8).map((signal) => signal.confidence || 0)), 0, 100),
    score: blend.score,
    metricIds: ['global-risk-score'],
    relatedEventIds: [],
    tags: ['composite', 'umbrella'],
    region: 'Global',
    sourceRefs: ['derived'],
    breakdown: blend.breakdown
  };

  const topSignals = blend.topSignals.slice(0, 10).map((signal) => ({
    ...signal,
    module: 'global-risk' as const,
    id: `global-risk:driver:${signal.id}`,
    title: `Top Driver: ${signal.title}`,
    description: `${signal.description} (source module: ${signal.module})`
  }));

  const [financialEvents, capitalEvents] = await Promise.all([
    getFinancialEvents(timeRange),
    getCapitalFlowEvents(timeRange, capitalFull)
  ]);
  const aiEvents = filterByRange(aiEventsFull, timeRange);

  const events = rankGlobalEvents([
    ...financialEvents,
    ...capitalEvents,
    ...aiEvents,
    ...topSignals.slice(0, 5).map((signal, index) => ({
      id: `global-risk:change:${index}:${signal.id}`,
      module: 'global-risk' as const,
      title: `What changed: ${signal.title}`,
      summary: `${signal.description}. Score ${signal.score.toFixed(1)}.`,
      timestamp: signal.timestamp,
      source: 'derived',
      tags: ['change-feed'],
      severity: signal.severity,
      region: signal.region
    }))
  ]);

  const moduleSeries = [
    ...financialFull.filter((series) => ['yield-spread', 'cpi', 'unemployment'].includes(series.metricId)),
    ...capitalFull.filter((series) => ['btc-price', 'stablecoin-total-market-cap'].includes(series.metricId)),
    ...aiFull
  ];

  const timeseries = filterTimeseriesByRange([blendGlobalTimeseries(moduleSeries)], timeRange);

  return { timeseries, events, signals: rankSignals([globalSignal, ...topSignals]) };
};

const rankGlobalEvents = (events: Event[]) =>
  [...events]
    .sort((left, right) => {
      const severityDelta = (right.severity ?? 0) - (left.severity ?? 0);
      if (severityDelta !== 0) {
        return severityDelta;
      }
      return right.timestamp.localeCompare(left.timestamp);
    })
    .slice(0, 200)
    .map((event) => ({ ...event, module: 'global-risk' as const }));

export const validateModuleQuery = (module: string, timeRange: string) => {
  if (!isModuleId(module)) {
    throw new Error(`Unknown module: ${module}. Valid modules: ${Object.keys(moduleConfigs).join(', ')}`);
  }

  if (!isTimeRange(timeRange)) {
    throw new Error(`Unknown timeRange: ${timeRange}`);
  }

  return {
    module,
    timeRange
  };
};

export const buildSignalsResponse = async (
  module: ModuleId,
  timeRange: TimeRange,
  env: SourceEnv
): Promise<ApiEnvelope<Signal[]>> => {
  const payload = await getModulePayload(module, timeRange, env);
  const envelope = toEnvelope(payload.signals);
  return signalsResponseSchema.parse(envelope);
};

export const buildEventsResponse = async (
  module: ModuleId,
  timeRange: TimeRange,
  env: SourceEnv
): Promise<ApiEnvelope<Event[]>> => {
  const payload = await getModulePayload(module, timeRange, env);
  const envelope = toEnvelope(payload.events);
  return eventsResponseSchema.parse(envelope);
};

export const buildTimeseriesResponse = async (
  module: ModuleId,
  timeRange: TimeRange,
  metric: string | undefined,
  env: SourceEnv
): Promise<ApiEnvelope<Timeseries[]>> => {
  const payload = await getModulePayload(module, timeRange, env);
  const filtered = metric ? payload.timeseries.filter((series) => series.metricId === metric) : payload.timeseries;
  const envelope = toEnvelope(filtered);
  return timeseriesResponseSchema.parse(envelope);
};

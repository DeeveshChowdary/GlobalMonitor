import type { ModuleId, Signal, Timeseries } from '@gm/schema';
import { clamp, mean, stdDev, toIso } from '@gm/utils';

export type MetricSignalConfig = {
  metricId: string;
  title: string;
  description: string;
  module: ModuleId;
  tags?: string[];
  invert?: boolean;
  region?: string;
  country?: string;
};

export const rollingZScore = (values: number[], window = 252) => {
  if (values.length === 0) {
    return [] as number[];
  }
  return values.map((value, index) => {
    const start = Math.max(0, index - window + 1);
    const slice = values.slice(start, index + 1);
    const sigma = stdDev(slice);
    if (sigma === 0) {
      return 0;
    }
    return (value - mean(slice)) / sigma;
  });
};

export const sigmoidSeverity = (zScore: number) => {
  const severity = 100 / (1 + Math.exp(-zScore));
  return clamp(severity, 0, 100);
};

export const computeConfidence = (values: number[]) => {
  if (values.length < 10) {
    return 30;
  }
  const completeness = clamp((values.filter(Number.isFinite).length / values.length) * 100, 0, 100);
  const volatilityPenalty = clamp(stdDev(values) * 2, 0, 35);
  return clamp(completeness - volatilityPenalty + 10, 10, 100);
};

export const accelerationFromSeries = (severities: number[], lookback = 7) => {
  if (severities.length === 0) {
    return 0;
  }
  const latest = severities[severities.length - 1];
  const lag = severities[Math.max(0, severities.length - 1 - lookback)] ?? latest;
  return clamp(latest - lag, -100, 100);
};

const buildSignalId = (module: ModuleId, metricId: string) => `${module}:${metricId}`;

export const signalFromTimeseries = (
  series: Timeseries,
  config: Omit<MetricSignalConfig, 'metricId' | 'module'>
): Signal | null => {
  if (series.points.length < 5) {
    return null;
  }

  const values = series.points.map((point) => point.value).filter(Number.isFinite);
  const zscores = rollingZScore(values, Math.min(252, values.length));
  if (zscores.length === 0) {
    return null;
  }

  const adjusted = zscores.map((value) => (config.invert ? -value : value));
  const severities = adjusted.map(sigmoidSeverity);
  const severity = severities[severities.length - 1] ?? 0;
  const acceleration = accelerationFromSeries(severities, 7);
  const confidence = computeConfidence(values);
  const score = clamp(severity * 0.7 + acceleration * 0.3, 0, 100);

  return {
    id: buildSignalId(series.module, series.metricId),
    module: series.module,
    title: config.title,
    description: config.description,
    timestamp: series.points[series.points.length - 1]?.timestamp ?? toIso(Date.now()),
    severity,
    acceleration,
    confidence,
    score,
    metricIds: [series.metricId],
    relatedEventIds: [],
    tags: config.tags ?? [],
    region: config.region,
    country: config.country,
    sourceRefs: [series.source]
  };
};

export const rankSignals = (signals: Signal[]) =>
  [...signals].sort((left, right) => right.score - left.score || right.severity - left.severity);

export const globalRiskBlend = (
  inputs: Array<{ module: ModuleId; signals: Signal[] }>
): { score: number; breakdown: Record<string, number>; topSignals: Signal[] } => {
  const weightedModuleScores: Array<{ module: ModuleId; weighted: number }> = inputs.map((entry) => {
    const top = rankSignals(entry.signals).slice(0, 10);
    if (top.length === 0) {
      return { module: entry.module, weighted: 0 };
    }
    const avg = mean(top.map((signal) => signal.score));
    return { module: entry.module, weighted: avg };
  });

  const score = clamp(mean(weightedModuleScores.map((entry) => entry.weighted)), 0, 100);
  const breakdown = Object.fromEntries(weightedModuleScores.map((entry) => [entry.module, entry.weighted]));
  const topSignals = rankSignals(inputs.flatMap((entry) => entry.signals)).slice(0, 12);

  return { score, breakdown, topSignals };
};

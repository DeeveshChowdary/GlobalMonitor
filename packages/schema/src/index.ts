import { z } from 'zod';

export const modules = ['global-risk', 'financial-stress', 'capital-flows', 'ai-tech'] as const;
export type ModuleId = (typeof modules)[number];

export const timeRanges = ['24h', '7d', '30d', '90d'] as const;
export type TimeRange = (typeof timeRanges)[number];

export const pointSchema = z.object({
  timestamp: z.string(),
  value: z.number()
});

export const timeseriesSchema = z.object({
  id: z.string(),
  module: z.enum(modules),
  metricId: z.string(),
  label: z.string(),
  unit: z.string().optional(),
  source: z.string(),
  points: z.array(pointSchema),
  tags: z.array(z.string()).default([])
});

export const eventSchema = z.object({
  id: z.string(),
  module: z.enum(modules),
  title: z.string(),
  summary: z.string().optional(),
  url: z.string().url().optional(),
  timestamp: z.string(),
  source: z.string(),
  tags: z.array(z.string()).default([]),
  region: z.string().optional(),
  severity: z.number().min(0).max(100).optional()
});

export const signalSchema = z.object({
  id: z.string(),
  module: z.enum(modules),
  title: z.string(),
  description: z.string(),
  timestamp: z.string(),
  severity: z.number().min(0).max(100),
  acceleration: z.number().min(-100).max(100),
  confidence: z.number().min(0).max(100),
  score: z.number().min(0).max(100),
  metricIds: z.array(z.string()).default([]),
  relatedEventIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  region: z.string().optional(),
  country: z.string().length(2).optional(),
  sourceRefs: z.array(z.string()).default([]),
  breakdown: z.record(z.number()).optional()
});

export const apiEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    version: z.literal('v1'),
    generatedAt: z.string(),
    data: dataSchema
  });

export const signalsResponseSchema = apiEnvelopeSchema(z.array(signalSchema));
export const eventsResponseSchema = apiEnvelopeSchema(z.array(eventSchema));
export const timeseriesResponseSchema = apiEnvelopeSchema(z.array(timeseriesSchema));

export type Signal = z.infer<typeof signalSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Timeseries = z.infer<typeof timeseriesSchema>;

export type ApiEnvelope<T> = {
  version: 'v1';
  generatedAt: string;
  data: T;
};

export type SignalResponse = z.infer<typeof signalsResponseSchema>;
export type EventResponse = z.infer<typeof eventsResponseSchema>;
export type TimeseriesResponse = z.infer<typeof timeseriesResponseSchema>;

export type ModuleConfig = {
  id: ModuleId;
  label: string;
  description: string;
  defaultLayers: string[];
  defaultMetrics: string[];
  sources: string[];
  layout: {
    showMap: boolean;
    chartPlacement: 'right' | 'bottom';
  };
};

export const moduleConfigs: Record<ModuleId, ModuleConfig> = {
  'global-risk': {
    id: 'global-risk',
    label: 'Global Risk',
    description: 'Umbrella monitor that fuses the strongest cross-module signals.',
    defaultLayers: ['choropleth', 'signals', 'events'],
    defaultMetrics: ['global-risk-score'],
    sources: ['derived:financial-stress', 'derived:capital-flows', 'derived:ai-tech'],
    layout: { showMap: true, chartPlacement: 'right' }
  },
  'financial-stress': {
    id: 'financial-stress',
    label: 'Financial Stress',
    description: 'Macro and credit stress indicators built from public macro series.',
    defaultLayers: ['choropleth', 'signals'],
    defaultMetrics: ['us10y', 'us2y', 'yield-spread', 'cpi', 'unemployment'],
    sources: ['fred'],
    layout: { showMap: true, chartPlacement: 'right' }
  },
  'capital-flows': {
    id: 'capital-flows',
    label: 'Capital Flows',
    description: 'Crypto and risk proxy flow monitor from key market indicators.',
    defaultLayers: ['choropleth', 'signals', 'events'],
    defaultMetrics: ['btc-price', 'eth-price', 'usdt-market-cap', 'usdc-market-cap'],
    sources: ['coingecko'],
    layout: { showMap: true, chartPlacement: 'right' }
  },
  'ai-tech': {
    id: 'ai-tech',
    label: 'AI & Tech',
    description: 'Research and release velocity monitor from public feeds.',
    defaultLayers: ['signals', 'events'],
    defaultMetrics: ['arxiv-publication-rate', 'github-release-rate'],
    sources: ['arxiv-rss', 'github-atom'],
    layout: { showMap: true, chartPlacement: 'right' }
  }
};

export const isModuleId = (value: string): value is ModuleId =>
  modules.includes(value as ModuleId);

export const isTimeRange = (value: string): value is TimeRange =>
  timeRanges.includes(value as TimeRange);

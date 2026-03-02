import type { UiModuleConfig } from './types';

export const globalRiskConfig: UiModuleConfig = {
  id: 'global-risk',
  label: 'Global Risk',
  description: 'Umbrella view of top cross-module signals and what changed.',
  defaultLayers: ['choropleth', 'signals', 'events'],
  defaultMetrics: ['global-risk-score'],
  sources: ['derived:financial-stress', 'derived:capital-flows', 'derived:ai-tech'],
  layout: { showMap: true, chartPlacement: 'right' }
};

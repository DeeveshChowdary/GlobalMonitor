import type { UiModuleConfig } from './types';

export const financialStressConfig: UiModuleConfig = {
  id: 'financial-stress',
  label: 'Financial Stress',
  description: 'Macro stress indicators from FRED public data.',
  defaultLayers: ['choropleth', 'signals'],
  defaultMetrics: ['us10y', 'us2y', 'yield-spread', 'cpi', 'unemployment'],
  sources: ['fred'],
  layout: { showMap: true, chartPlacement: 'right' }
};

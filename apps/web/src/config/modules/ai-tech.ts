import type { UiModuleConfig } from './types';

export const aiTechConfig: UiModuleConfig = {
  id: 'ai-tech',
  label: 'AI & Tech',
  description: 'Research and release velocity from free feeds.',
  defaultLayers: ['signals', 'events'],
  defaultMetrics: ['arxiv-publication-rate', 'github-release-rate'],
  sources: ['arxiv-rss', 'github-atom'],
  layout: { showMap: true, chartPlacement: 'right' }
};

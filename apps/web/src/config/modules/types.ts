import type { ModuleId } from '@gm/schema';

export type UiModuleConfig = {
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

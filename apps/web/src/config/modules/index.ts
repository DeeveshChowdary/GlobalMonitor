import type { ModuleId } from '@gm/schema';
import { aiTechConfig } from './ai-tech';
import { capitalFlowsConfig } from './capital-flows';
import { financialStressConfig } from './financial-stress';
import { globalRiskConfig } from './global-risk';
import type { UiModuleConfig } from './types';

export const moduleRegistry: Record<ModuleId, UiModuleConfig> = {
  'global-risk': globalRiskConfig,
  'financial-stress': financialStressConfig,
  'capital-flows': capitalFlowsConfig,
  'ai-tech': aiTechConfig
};

export const moduleList = Object.values(moduleRegistry);

import type { UiModuleConfig } from './types';

export const capitalFlowsConfig: UiModuleConfig = {
  id: 'capital-flows',
  label: 'Capital Flows',
  description: 'Risk-on and liquidity proxies from crypto markets.',
  defaultLayers: ['choropleth', 'signals', 'events'],
  defaultMetrics: ['btc-price', 'eth-price', 'usdt-market-cap', 'usdc-market-cap'],
  sources: ['coingecko'],
  layout: { showMap: true, chartPlacement: 'right' }
};

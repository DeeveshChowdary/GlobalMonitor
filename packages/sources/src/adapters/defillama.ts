import type { Timeseries } from '@gm/schema';
import { fetchWithTimeout } from '@gm/utils';

type StablecoinPoint = {
  date: string;
  totalCirculatingUSD?: {
    peggedUSD?: number;
  };
};

const stablecoinTotalUrl = 'https://stablecoins.llama.fi/stablecoincharts/all';

export const fetchDefiLlamaStablecoinTotalSeries = async (days: number): Promise<Timeseries> => {
  const response = await fetchWithTimeout(stablecoinTotalUrl, { headers: { Accept: 'application/json' } }, 20000);
  if (!response.ok) {
    throw new Error(`DefiLlama request failed status=${response.status}`);
  }

  const payload = (await response.json()) as StablecoinPoint[];
  const points = payload
    .map((entry) => {
      const timestamp = new Date(Number(entry.date) * 1000);
      const value = entry.totalCirculatingUSD?.peggedUSD;
      return {
        timestamp: timestamp.toISOString(),
        value: Number(value)
      };
    })
    .filter((point) => Number.isFinite(point.value))
    .slice(-Math.max(30, days));

  return {
    id: 'capital-flows:stablecoin-total-market-cap',
    module: 'capital-flows',
    metricId: 'stablecoin-total-market-cap',
    label: 'Stablecoin Total Market Cap',
    source: 'DefiLlama (fallback)',
    unit: 'USD',
    points,
    tags: ['stablecoin', 'liquidity', 'fallback']
  };
};

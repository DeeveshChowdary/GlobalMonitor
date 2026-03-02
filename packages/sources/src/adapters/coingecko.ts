import type { Timeseries } from '@gm/schema';
import { fetchWithTimeout } from '@gm/utils';

type CoinGeckoPoint = [number, number];

type MarketChartResponse = {
  prices?: CoinGeckoPoint[];
  market_caps?: CoinGeckoPoint[];
};

const marketChartUrl = (coinId: string, days: number) =>
  `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;

export const fetchCoinPriceSeries = async (
  coinId: string,
  metricId: string,
  label: string,
  days: number,
  useMarketCap = false
): Promise<Timeseries> => {
  const response = await fetchWithTimeout(marketChartUrl(coinId, days), {}, 9000);
  if (!response.ok) {
    throw new Error(`CoinGecko request failed for ${coinId}`);
  }

  const payload = (await response.json()) as MarketChartResponse;
  const source = useMarketCap ? payload.market_caps ?? [] : payload.prices ?? [];

  const points = source
    .map(([timestamp, value]) => ({
      timestamp: new Date(timestamp).toISOString(),
      value
    }))
    .filter((point) => Number.isFinite(point.value));

  return {
    id: `capital-flows:${metricId}`,
    module: 'capital-flows',
    metricId,
    label,
    source: 'CoinGecko',
    unit: 'USD',
    points,
    tags: ['crypto', useMarketCap ? 'market-cap' : 'price']
  };
};

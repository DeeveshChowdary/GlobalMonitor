import type { Timeseries } from '@gm/schema';
import { fetchWithTimeout } from '@gm/utils';

type CoinGeckoPoint = [number, number];

type MarketChartResponse = {
  prices?: CoinGeckoPoint[];
  market_caps?: CoinGeckoPoint[];
};

const marketChartUrl = (coinId: string, days: number) =>
  `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;

const fetchCoinGeckoWithRetry = async (url: string, attempts = 2) => {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            Accept: 'application/json'
          }
        },
        20_000
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`status=${response.status} body=${body.slice(0, 160)}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('unknown fetch error');
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error('CoinGecko request failed');
};

export const fetchCoinPriceSeries = async (
  coinId: string,
  metricId: string,
  label: string,
  days: number,
  useMarketCap = false
): Promise<Timeseries> => {
  const response = await fetchCoinGeckoWithRetry(marketChartUrl(coinId, days), 2);

  const payload = (await response.json()) as MarketChartResponse;
  const source = useMarketCap ? (payload.market_caps ?? []) : (payload.prices ?? []);

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

import type { Timeseries } from '@gm/schema';
import { fetchWithTimeout } from '@gm/utils';

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string
];

const klinesUrl = (symbol: string, days: number) =>
  `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=${Math.min(1000, Math.max(30, days))}`;

export const fetchBinancePriceSeries = async (
  symbol: string,
  metricId: string,
  label: string,
  days: number
): Promise<Timeseries> => {
  const response = await fetchWithTimeout(klinesUrl(symbol, days), { headers: { Accept: 'application/json' } }, 20000);
  if (!response.ok) {
    throw new Error(`Binance request failed for ${symbol} status=${response.status}`);
  }

  const payload = (await response.json()) as BinanceKline[];
  const points = payload
    .map((kline) => ({
      timestamp: new Date(kline[0]).toISOString(),
      value: Number.parseFloat(kline[4])
    }))
    .filter((point) => Number.isFinite(point.value));

  return {
    id: `capital-flows:${metricId}`,
    module: 'capital-flows',
    metricId,
    label,
    source: 'Binance (fallback)',
    unit: 'USD',
    points,
    tags: ['crypto', 'fallback']
  };
};

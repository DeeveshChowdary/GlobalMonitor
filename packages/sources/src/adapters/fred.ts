import type { Timeseries } from '@gm/schema';
import { fetchWithTimeout, parseCsv } from '@gm/utils';

export type FredSeriesConfig = {
  seriesId: string;
  metricId: string;
  label: string;
  unit?: string;
};

const fredGraphCsvUrl = (seriesId: string) =>
  `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;

const fredApiJsonUrl = (seriesId: string, apiKey: string) =>
  `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(seriesId)}&api_key=${encodeURIComponent(apiKey)}&file_type=json`;

const mapCsvRowsToPoints = (rows: Array<Record<string, string>>) =>
  rows
    .map((row) => ({
      timestamp: new Date(row.DATE).toISOString(),
      value: Number.parseFloat(row.VALUE)
    }))
    .filter((point) => Number.isFinite(point.value));

export const fetchFredSeries = async (
  config: FredSeriesConfig,
  apiKey: string | undefined,
  module: 'financial-stress' = 'financial-stress'
): Promise<Timeseries> => {
  if (apiKey) {
    const response = await fetchWithTimeout(fredApiJsonUrl(config.seriesId, apiKey), {}, 9000);
    if (response.ok) {
      const payload = (await response.json()) as {
        observations?: Array<{ date: string; value: string }>;
      };
      const points = (payload.observations ?? [])
        .map((observation) => ({
          timestamp: new Date(observation.date).toISOString(),
          value: Number.parseFloat(observation.value)
        }))
        .filter((point) => Number.isFinite(point.value));

      return {
        id: `${module}:${config.metricId}`,
        module,
        metricId: config.metricId,
        label: config.label,
        unit: config.unit,
        source: 'FRED',
        points,
        tags: ['macro', 'fred']
      };
    }
  }

  const response = await fetchWithTimeout(fredGraphCsvUrl(config.seriesId), {}, 9000);
  if (!response.ok) {
    throw new Error(`FRED request failed for ${config.seriesId}`);
  }

  const text = await response.text();
  const rows = parseCsv(text);
  const points = mapCsvRowsToPoints(rows);

  return {
    id: `${module}:${config.metricId}`,
    module,
    metricId: config.metricId,
    label: config.label,
    unit: config.unit,
    source: 'FRED',
    points,
    tags: ['macro', 'fred']
  };
};

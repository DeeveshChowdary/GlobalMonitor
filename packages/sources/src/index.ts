import type { Event, TimeRange, Timeseries } from '@gm/schema';
import { ARXIV_FEEDS, DEFAULT_GITHUB_RELEASE_REPOS } from './config';
import { fetchCoinPriceSeries } from './adapters/coingecko';
import { fetchFredSeries } from './adapters/fred';
import { fetchFeedEvents } from './adapters/rss';
import { cutoffIso } from './time';
import { groupByDay } from '@gm/utils';

export type SourceEnv = {
  FRED_API_KEY?: string;
  GITHUB_RELEASE_REPOS?: string;
};

export const filterByRange = <T extends { timestamp: string }>(items: T[], timeRange: TimeRange) => {
  const cutoff = cutoffIso(timeRange);
  return items.filter((item) => item.timestamp >= cutoff);
};

const createCountSeries = (
  metricId: string,
  label: string,
  source: string,
  module: 'ai-tech',
  events: Event[]
): Timeseries => {
  const grouped = groupByDay(events);
  const points = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([day, values]) => ({
      timestamp: `${day}T00:00:00.000Z`,
      value: values.length
    }));

  return {
    id: `${module}:${metricId}`,
    module,
    metricId,
    label,
    source,
    unit: 'count/day',
    points,
    tags: ['velocity']
  };
};

export const getFinancialTimeseries = async (env: SourceEnv) => {
  const baseSeries = await Promise.all([
    fetchFredSeries({ seriesId: 'DGS10', metricId: 'us10y', label: 'US 10Y Treasury Yield', unit: '%' }, env.FRED_API_KEY),
    fetchFredSeries({ seriesId: 'DGS2', metricId: 'us2y', label: 'US 2Y Treasury Yield', unit: '%' }, env.FRED_API_KEY),
    fetchFredSeries({ seriesId: 'UNRATE', metricId: 'unemployment', label: 'US Unemployment Rate', unit: '%' }, env.FRED_API_KEY),
    fetchFredSeries({ seriesId: 'CPIAUCSL', metricId: 'cpi', label: 'US CPI Index', unit: 'index' }, env.FRED_API_KEY),
    fetchFredSeries({ seriesId: 'BAA10Y', metricId: 'credit-spread-proxy', label: 'BAA - 10Y Spread Proxy', unit: '%' }, env.FRED_API_KEY)
  ]);

  const byMetric = Object.fromEntries(baseSeries.map((series) => [series.metricId, series]));
  const us10y = byMetric['us10y'];
  const us2y = byMetric['us2y'];

  const alignedLength = Math.min(us10y?.points.length ?? 0, us2y?.points.length ?? 0);
  const spreadPoints = Array.from({ length: alignedLength }, (_, index) => {
    const ten = us10y.points[index];
    const two = us2y.points[index];
    return {
      timestamp: ten.timestamp,
      value: ten.value - two.value
    };
  });

  const spreadSeries: Timeseries = {
    id: 'financial-stress:yield-spread',
    module: 'financial-stress',
    metricId: 'yield-spread',
    label: '10Y - 2Y Yield Spread',
    source: 'Derived(FRED)',
    unit: '%',
    points: spreadPoints,
    tags: ['macro', 'yield-curve']
  };

  return [...baseSeries, spreadSeries];
};

export const getFinancialEvents = async (timeRange: TimeRange): Promise<Event[]> => {
  const now = new Date();
  const events: Event[] = [
    {
      id: `financial-stress:system-note:${now.toISOString().slice(0, 10)}`,
      module: 'financial-stress',
      title: 'Macro monitoring active (keyless mode)',
      summary: 'Using public FRED endpoints; optional API key can improve quota resilience.',
      timestamp: now.toISOString(),
      source: 'system',
      tags: ['status']
    }
  ];
  return filterByRange(events, timeRange);
};

export const getAiTechEvents = async (timeRange: TimeRange, env: SourceEnv): Promise<Event[]> => {
  const arxivEventsByFeed = await Promise.all(
    ARXIV_FEEDS.map((feed) =>
      fetchFeedEvents({
        module: 'ai-tech',
        source: `arXiv:${feed.id}`,
        feedUrl: feed.url,
        tags: ['research', 'arxiv'],
        severity: 45
      })
    )
  );

  const repoConfig = env.GITHUB_RELEASE_REPOS?.split(',').map((value) => value.trim()).filter(Boolean) ?? DEFAULT_GITHUB_RELEASE_REPOS;
  const githubEventsByRepo = await Promise.all(
    repoConfig.map((repo) =>
      fetchFeedEvents({
        module: 'ai-tech',
        source: `GitHub:${repo}`,
        feedUrl: `https://github.com/${repo}/releases.atom`,
        tags: ['release', 'github'],
        severity: 55
      })
    )
  );

  const merged = [...arxivEventsByFeed.flat(), ...githubEventsByRepo.flat()]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 500);

  return filterByRange(merged, timeRange);
};

export const getAiTechTimeseriesFromEvents = (events: Event[]): Timeseries[] => {
  const arxivEvents = events.filter((event) => event.source.startsWith('arXiv'));
  const releaseEvents = events.filter((event) => event.source.startsWith('GitHub'));

  return [
    createCountSeries('arxiv-publication-rate', 'arXiv AI Paper Velocity', 'arXiv RSS', 'ai-tech', arxivEvents),
    createCountSeries('github-release-rate', 'GitHub Release Velocity', 'GitHub Atom', 'ai-tech', releaseEvents)
  ];
};

export const getAiTechTimeseries = async (timeRange: TimeRange, env: SourceEnv): Promise<Timeseries[]> => {
  const events = await getAiTechEvents(timeRange, env);
  return getAiTechTimeseriesFromEvents(events);
};

export const getCapitalFlowTimeseries = async (lookbackDays = 365): Promise<Timeseries[]> => {
  return Promise.all([
    fetchCoinPriceSeries('bitcoin', 'btc-price', 'BTC Price', lookbackDays),
    fetchCoinPriceSeries('ethereum', 'eth-price', 'ETH Price', lookbackDays),
    fetchCoinPriceSeries('tether', 'usdt-market-cap', 'USDT Market Cap', lookbackDays, true),
    fetchCoinPriceSeries('usd-coin', 'usdc-market-cap', 'USDC Market Cap', lookbackDays, true)
  ]);
};

export const getCapitalFlowEvents = async (
  timeRange: TimeRange,
  inputSeries?: Timeseries[]
): Promise<Event[]> => {
  const series = inputSeries ?? (await getCapitalFlowTimeseries());
  const ranged = series.map((metric) => ({ ...metric, points: filterByRange(metric.points, timeRange) }));
  const events: Event[] = [];

  for (const metric of ranged) {
    if (metric.points.length < 2) {
      continue;
    }
    const latest = metric.points[metric.points.length - 1];
    const previous = metric.points[metric.points.length - 2];
    const changePct = ((latest.value - previous.value) / (previous.value || 1)) * 100;

    if (Math.abs(changePct) < 2) {
      continue;
    }

    events.push({
      id: `capital-flows:${metric.metricId}:${latest.timestamp}`,
      module: 'capital-flows',
      title: `${metric.label} ${changePct >= 0 ? 'up' : 'down'} ${Math.abs(changePct).toFixed(2)}%`,
      summary: 'Daily move exceeded 2% threshold proxy.',
      timestamp: latest.timestamp,
      source: 'CoinGecko',
      tags: ['market-move'],
      severity: Math.min(95, Math.abs(changePct) * 6)
    });
  }

  return events.sort((left, right) => right.timestamp.localeCompare(left.timestamp));
};

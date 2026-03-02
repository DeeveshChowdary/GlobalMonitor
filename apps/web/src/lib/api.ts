import type { Event, Signal, Timeseries } from '@gm/schema';

type Envelope<T> = {
  version: 'v1';
  generatedAt: string;
  data: T;
  error?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const fetchJson = async <T>(url: string): Promise<Envelope<T>> => {
  const response = await fetch(`${API_BASE}${url}`);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }
  return (await response.json()) as Envelope<T>;
};

export const loadSignals = (module: string, timeRange: string) =>
  fetchJson<Signal[]>(`/api/signals?module=${encodeURIComponent(module)}&timeRange=${encodeURIComponent(timeRange)}`);

export const loadEvents = (module: string, timeRange: string) =>
  fetchJson<Event[]>(`/api/events?module=${encodeURIComponent(module)}&timeRange=${encodeURIComponent(timeRange)}`);

export const loadTimeseries = (module: string, timeRange: string, metric?: string) => {
  const params = new URLSearchParams({ module, timeRange });
  if (metric) {
    params.set('metric', metric);
  }
  return fetchJson<Timeseries[]>(`/api/timeseries?${params.toString()}`);
};

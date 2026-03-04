import type { Event, Signal, Timeseries } from '@gm/schema';

type Envelope<T> = {
  version: 'v1';
  generatedAt: string;
  data: T;
  error?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const REMOTE_FALLBACK_BASE = 'https://global-monitor-api.globalmonitor-deevesh.workers.dev';
const REQUEST_TIMEOUT_MS = 12_000;
const RETRY_ATTEMPTS = 2;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeBase = (base: string) => base.trim().replace(/\/+$/, '');

const resolveApiBases = () => {
  const explicit = API_BASE
    .split(',')
    .map((value: string) => normalizeBase(value))
    .filter((value: string) => value.length > 0);

  if (explicit.length > 0) {
    return [...new Set(explicit)];
  }

  const localBases = [''];
  const host = typeof window === 'undefined' ? '' : window.location.hostname.toLowerCase();
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';

  if (!isLocalHost) {
    localBases.push(REMOTE_FALLBACK_BASE);
  }

  return [...new Set(localBases)];
};

const requestEnvelope = async <T>(path: string): Promise<Envelope<T>> => {
  const candidates = resolveApiBases();
  const failures: string[] = [];

  for (const base of candidates) {
    const target = `${base}${path}`;
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetchWithTimeout(target, REQUEST_TIMEOUT_MS);
        if (response.ok) {
          return (await response.json()) as Envelope<T>;
        }

        if ((response.status >= 500 || response.status === 429) && attempt < RETRY_ATTEMPTS) {
          await wait(250 * attempt);
          continue;
        }

        failures.push(`${target} -> ${response.status}`);
        break;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown fetch error';
        if (attempt < RETRY_ATTEMPTS) {
          await wait(250 * attempt);
          continue;
        }
        failures.push(`${target} -> ${reason}`);
      }
    }
  }

  throw new Error(`All API attempts failed for ${path}: ${failures.join('; ')}`);
};

export const loadSignals = (module: string, timeRange: string) =>
  requestEnvelope<Signal[]>(
    `/api/signals?module=${encodeURIComponent(module)}&timeRange=${encodeURIComponent(timeRange)}`
  );

export const loadEvents = (module: string, timeRange: string) =>
  requestEnvelope<Event[]>(
    `/api/events?module=${encodeURIComponent(module)}&timeRange=${encodeURIComponent(timeRange)}`
  );

export const loadTimeseries = (module: string, timeRange: string, metric?: string) => {
  const params = new URLSearchParams({ module, timeRange });
  if (metric) {
    params.set('metric', metric);
  }
  return requestEnvelope<Timeseries[]>(`/api/timeseries?${params.toString()}`);
};

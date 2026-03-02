import type { TimeRange } from '@gm/schema';

export type EnvBindings = {
  FRED_API_KEY?: string;
  GITHUB_RELEASE_REPOS?: string;
  CACHE_KV?: KVNamespace;
};

export type QueryArgs = {
  module: string;
  timeRange: TimeRange;
  metric?: string;
};

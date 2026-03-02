import type { TimeRange } from '@gm/schema';

export const timeRangeToDays = (timeRange: TimeRange) => {
  switch (timeRange) {
    case '24h':
      return 1;
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    default:
      return 30;
  }
};

export const cutoffIso = (timeRange: TimeRange) => {
  const days = timeRangeToDays(timeRange);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(cutoff).toISOString();
};

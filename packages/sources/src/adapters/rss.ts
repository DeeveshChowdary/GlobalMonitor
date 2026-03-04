import type { Event, ModuleId } from '@gm/schema';
import { fetchWithTimeout } from '@gm/utils';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ''
});

type FeedEventConfig = {
  module: ModuleId;
  source: string;
  feedUrl: string;
  tags?: string[];
  severity?: number;
};

const asArray = <T>(value: T | T[] | undefined): T[] => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const normalizeUrl = (candidate: string | undefined) => {
  if (!candidate) {
    return undefined;
  }
  try {
    const parsed = new URL(candidate);
    return parsed.toString();
  } catch {
    return undefined;
  }
};

const normalizeTimestamp = (candidate: string | undefined) => {
  const date = candidate ? new Date(candidate) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const asText = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value && typeof value === 'object' && '#text' in value) {
    const text = (value as { '#text'?: unknown })['#text'];
    return typeof text === 'string' ? text : '';
  }
  return '';
};

export const fetchFeedEvents = async ({
  module,
  source,
  feedUrl,
  tags = [],
  severity
}: FeedEventConfig): Promise<Event[]> => {
  try {
    const response = await fetchWithTimeout(feedUrl, {}, 9000);
    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const parsed = parser.parse(xml) as Record<string, any>;

    const rssItems = asArray(parsed?.rss?.channel?.item);
    const atomEntries = asArray(parsed?.feed?.entry);

    const fromRss = rssItems.map((item) => {
      const linkValue =
        typeof item.link === 'string'
          ? item.link
          : typeof item.link?.href === 'string'
            ? item.link.href
            : undefined;

      return {
        id: `${source}:${asText(item.guid) || linkValue || asText(item.title) || 'untitled'}`,
        module,
        title: asText(item.title) || 'Untitled Event',
        summary:
          typeof item.description === 'string'
            ? item.description.replace(/<[^>]+>/g, '').slice(0, 240)
            : undefined,
        url: normalizeUrl(linkValue),
        timestamp: normalizeTimestamp(item.pubDate),
        source,
        tags,
        severity
      } satisfies Event;
    });

    const fromAtom = atomEntries.map((entry) => {
      const links = asArray(entry.link);
      const primaryLink =
        links.find((link) => link.rel === 'alternate')?.href ??
        links[0]?.href ??
        (typeof entry.link === 'string' ? entry.link : undefined);

      const summary = typeof entry.summary === 'string' ? entry.summary : entry.summary?.['#text'];

      return {
        id: `${source}:${asText(entry.id) || primaryLink || asText(entry.title) || 'untitled'}`,
        module,
        title: asText(entry.title) || 'Untitled Event',
        summary:
          typeof summary === 'string' ? summary.replace(/<[^>]+>/g, '').slice(0, 240) : undefined,
        url: normalizeUrl(primaryLink),
        timestamp: normalizeTimestamp(entry.updated ?? entry.published),
        source,
        tags,
        severity
      } satisfies Event;
    });

    return [...fromRss, ...fromAtom];
  } catch {
    return [];
  }
};

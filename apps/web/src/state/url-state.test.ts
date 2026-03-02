import { describe, expect, it } from 'vitest';
import {
  defaultUrlSnapshot,
  parseUrlStateFromSearch,
  serializeUrlStateToSearch,
  type UrlSnapshot
} from './url-state';

describe('url state parsing/serialization', () => {
  it('round-trips module/timeRange/layers/viewport/selection', () => {
    const source: UrlSnapshot = {
      module: 'capital-flows',
      timeRange: '30d',
      layers: ['signals', 'events'],
      lat: 10.12345,
      lon: -22.22334,
      zoom: 3.333,
      view: 'global',
      selectedSignalId: 'capital-flows:btc-price'
    };

    const search = serializeUrlStateToSearch(source);
    const parsed = parseUrlStateFromSearch(search);

    expect(parsed.module).toBe(source.module);
    expect(parsed.timeRange).toBe(source.timeRange);
    expect(parsed.layers).toEqual(source.layers);
    expect(parsed.selectedSignalId).toBe(source.selectedSignalId);
    expect(parsed.lat).toBeCloseTo(10.1235, 4);
    expect(parsed.lon).toBeCloseTo(-22.2233, 4);
    expect(parsed.zoom).toBeCloseTo(3.33, 2);
  });

  it('falls back to defaults on invalid module/timeRange', () => {
    const parsed = parseUrlStateFromSearch('?module=bad&timeRange=oops');
    expect(parsed.module).toBe(defaultUrlSnapshot.module);
    expect(parsed.timeRange).toBe(defaultUrlSnapshot.timeRange);
  });

  it('parses selectedSignalId and layer toggles from shared URL', () => {
    const parsed = parseUrlStateFromSearch(
      '?module=ai-tech&timeRange=7d&layers=signals,events&selectedSignalId=ai-tech:github-release-rate'
    );

    expect(parsed.module).toBe('ai-tech');
    expect(parsed.layers).toEqual(['signals', 'events']);
    expect(parsed.selectedSignalId).toBe('ai-tech:github-release-rate');
  });

  it('preserves map/time/layers when only module changes', () => {
    const initial = parseUrlStateFromSearch(
      '?module=financial-stress&timeRange=30d&layers=choropleth,signals&lat=12.5&lon=78.1&zoom=2.4'
    );
    const switched = {
      ...initial,
      module: 'ai-tech' as const,
      selectedSignalId: undefined
    };

    const parsed = parseUrlStateFromSearch(serializeUrlStateToSearch(switched));
    expect(parsed.timeRange).toBe('30d');
    expect(parsed.layers).toEqual(['choropleth', 'signals']);
    expect(parsed.lat).toBeCloseTo(12.5, 4);
    expect(parsed.lon).toBeCloseTo(78.1, 4);
    expect(parsed.zoom).toBeCloseTo(2.4, 2);
  });
});

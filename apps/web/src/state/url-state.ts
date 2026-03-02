import { create } from 'zustand';
import type { ModuleId, TimeRange } from '@gm/schema';
import { isModuleId, isTimeRange } from '@gm/schema';
import { moduleRegistry } from '../config/modules';

export type UrlState = {
  module: ModuleId;
  timeRange: TimeRange;
  layers: string[];
  lat: number;
  lon: number;
  zoom: number;
  view: string;
  selectedSignalId?: string;
  setState: (next: Partial<UrlState>) => void;
};

export type UrlSnapshot = Omit<UrlState, 'setState'>;

export const defaultUrlSnapshot: UrlSnapshot = {
  module: 'global-risk' as ModuleId,
  timeRange: '7d' as TimeRange,
  layers: moduleRegistry['global-risk'].defaultLayers,
  lat: 31.9895,
  lon: 0,
  zoom: 1.71,
  view: 'global'
};

const parseNumber = (raw: string | null, fallback: number) => {
  const parsed = Number.parseFloat(raw ?? `${fallback}`);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseUrlStateFromSearch = (search: string): UrlSnapshot => {
  const params = new URLSearchParams(search);
  const module = params.get('module') ?? defaultUrlSnapshot.module;
  const timeRange = params.get('timeRange') ?? defaultUrlSnapshot.timeRange;

  const parsedModule = isModuleId(module) ? module : defaultUrlSnapshot.module;
  const parsedTimeRange = isTimeRange(timeRange) ? timeRange : defaultUrlSnapshot.timeRange;

  return {
    module: parsedModule,
    timeRange: parsedTimeRange,
    layers:
      params
        .get('layers')
        ?.split(',')
        .map((value) => value.trim())
        .filter(Boolean) ?? moduleRegistry[parsedModule].defaultLayers,
    lat: parseNumber(params.get('lat'), defaultUrlSnapshot.lat),
    lon: parseNumber(params.get('lon'), defaultUrlSnapshot.lon),
    zoom: parseNumber(params.get('zoom'), defaultUrlSnapshot.zoom),
    view: params.get('view') ?? defaultUrlSnapshot.view,
    selectedSignalId: params.get('selectedSignalId') ?? undefined
  };
};

export const serializeUrlStateToSearch = (state: UrlSnapshot) => {
  const params = new URLSearchParams();
  params.set('module', state.module);
  params.set('timeRange', state.timeRange);
  params.set('layers', state.layers.join(','));
  params.set('lat', state.lat.toFixed(4));
  params.set('lon', state.lon.toFixed(4));
  params.set('zoom', state.zoom.toFixed(2));
  params.set('view', state.view);
  if (state.selectedSignalId) {
    params.set('selectedSignalId', state.selectedSignalId);
  }
  return params.toString();
};

const parseStateFromUrl = (): UrlSnapshot =>
  typeof window === 'undefined'
    ? { ...defaultUrlSnapshot, layers: [...defaultUrlSnapshot.layers] }
    : parseUrlStateFromSearch(window.location.search);

const serializeState = (state: UrlSnapshot) => {
  if (typeof window === 'undefined') {
    return;
  }
  const search = serializeUrlStateToSearch(state);
  const nextUrl = `${window.location.pathname}?${search}`;
  window.history.replaceState(null, '', nextUrl);
};

export const useUrlState = create<UrlState>((set) => ({
  ...parseStateFromUrl(),
  setState: (next) => {
    set((current) => {
      const updated = { ...current, ...next };
      serializeState(updated);
      return updated;
    });
  }
}));

export const resetLayersForModule = (module: ModuleId) => {
  const state = useUrlState.getState();
  state.setState({ layers: [...moduleRegistry[module].defaultLayers] });
};

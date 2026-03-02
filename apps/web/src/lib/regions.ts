import type { Event, Signal } from '@gm/schema';

export const regionCenters: Record<string, [number, number]> = {
  Global: [0, 15],
  'North America': [-98, 39],
  Europe: [10, 51],
  Asia: [103, 34],
  MENA: [40, 26],
  Africa: [22, 2],
  'Latin America': [-64, -15],
  Oceania: [134, -25]
};

export const signalToCoordinates = (signal: Signal): [number, number] => {
  if (signal.country === 'US') {
    return [-98, 39];
  }
  if (signal.region && regionCenters[signal.region]) {
    return regionCenters[signal.region];
  }
  return [0, 10];
};

export const eventToCoordinates = (event: Event): [number, number] => {
  if (event.region && regionCenters[event.region]) {
    return regionCenters[event.region];
  }
  return [0, 0];
};

export const coarseChoroplethGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { region: 'North America' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-168, 12], [-52, 12], [-52, 72], [-168, 72], [-168, 12]]]
      }
    },
    {
      type: 'Feature',
      properties: { region: 'Europe' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-11, 35], [40, 35], [40, 71], [-11, 71], [-11, 35]]]
      }
    },
    {
      type: 'Feature',
      properties: { region: 'Asia' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[40, 5], [150, 5], [150, 64], [40, 64], [40, 5]]]
      }
    },
    {
      type: 'Feature',
      properties: { region: 'MENA' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-17, 12], [65, 12], [65, 38], [-17, 38], [-17, 12]]]
      }
    },
    {
      type: 'Feature',
      properties: { region: 'Africa' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-20, -35], [52, -35], [52, 37], [-20, 37], [-20, -35]]]
      }
    },
    {
      type: 'Feature',
      properties: { region: 'Latin America' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-120, -56], [-30, -56], [-30, 32], [-120, 32], [-120, -56]]]
      }
    },
    {
      type: 'Feature',
      properties: { region: 'Oceania' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[110, -47], [180, -47], [180, 0], [110, 0], [110, -47]]]
      }
    }
  ]
} as const;

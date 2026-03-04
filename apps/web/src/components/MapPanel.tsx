import { useEffect, useMemo, useRef } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import type { Event, Signal } from '@gm/schema';
import { coarseChoroplethGeoJson, eventToCoordinates, signalToCoordinates } from '../lib/regions';

type Props = {
  lat: number;
  lon: number;
  zoom: number;
  layers: string[];
  signals: Signal[];
  events: Event[];
  onViewportChange: (next: { lat: number; lon: number; zoom: number }) => void;
};

const mapStyle = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors, &copy; CARTO'
    }
  },
  layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark' }]
} as const;

const setLayerVisibility = (map: MapLibreMap, id: string, visibility: 'visible' | 'none') => {
  if (map.getLayer(id)) {
    map.setLayoutProperty(id, 'visibility', visibility);
  }
};

export const MapPanel = ({ lat, lon, zoom, layers, signals, events, onViewportChange }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const signalGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: signals.map((signal) => {
        const [lng, latitude] = signalToCoordinates(signal);
        return {
          type: 'Feature',
          properties: {
            id: signal.id,
            label: signal.title,
            severity: signal.severity
          },
          geometry: {
            type: 'Point',
            coordinates: [lng, latitude]
          }
        };
      })
    }),
    [signals]
  );

  const eventGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: events.slice(0, 80).map((event) => {
        const [lng, latitude] = eventToCoordinates(event);
        return {
          type: 'Feature',
          properties: {
            id: event.id,
            label: event.title,
            severity: event.severity ?? 35
          },
          geometry: {
            type: 'Point',
            coordinates: [lng, latitude]
          }
        };
      })
    }),
    [events]
  );

  const choropleth = useMemo(() => {
    const regionScore = new Map<string, number[]>();
    for (const signal of signals) {
      const region = signal.region ?? 'Global';
      const current = regionScore.get(region) ?? [];
      current.push(signal.severity);
      regionScore.set(region, current);
    }

    return {
      ...coarseChoroplethGeoJson,
      features: coarseChoroplethGeoJson.features.map((feature) => {
        const key = String(feature.properties.region);
        const scores = regionScore.get(key) ?? [20];
        const avg = scores.reduce((acc, value) => acc + value, 0) / scores.length;
        return {
          ...feature,
          properties: {
            ...feature.properties,
            riskScore: avg
          }
        };
      })
    };
  }, [signals]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle as any,
      center: [lon, lat],
      zoom
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      map.addSource('risk-choropleth', {
        type: 'geojson',
        data: choropleth as any
      });

      map.addLayer({
        id: 'risk-fill',
        type: 'fill',
        source: 'risk-choropleth',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'riskScore'],
            0,
            'rgba(70, 104, 133, 0.18)',
            35,
            'rgba(78, 183, 255, 0.32)',
            60,
            'rgba(255, 190, 84, 0.42)',
            85,
            'rgba(255, 63, 96, 0.55)'
          ],
          'fill-opacity': 0.8
        }
      });

      map.addLayer({
        id: 'risk-outline',
        type: 'line',
        source: 'risk-choropleth',
        paint: {
          'line-color': '#87a9c2',
          'line-opacity': 0.25,
          'line-width': 1
        }
      });

      map.addSource('signal-markers', {
        type: 'geojson',
        data: signalGeoJson as any,
        cluster: true,
        clusterRadius: 45
      });

      map.addSource('event-markers', {
        type: 'geojson',
        data: eventGeoJson as any,
        cluster: true,
        clusterRadius: 45
      });

      map.addLayer({
        id: 'signal-clusters',
        type: 'circle',
        source: 'signal-markers',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#1ec8ff',
          'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 20, 22],
          'circle-opacity': 0.8
        }
      });

      map.addLayer({
        id: 'signal-points',
        type: 'circle',
        source: 'signal-markers',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'severity'],
            0,
            '#00c58d',
            50,
            '#ffbf69',
            100,
            '#ff2f6c'
          ],
          'circle-radius': 6.5,
          'circle-stroke-width': 1.2,
          'circle-stroke-color': '#0a1018'
        }
      });

      map.addLayer({
        id: 'event-clusters',
        type: 'circle',
        source: 'event-markers',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#64748b',
          'circle-radius': ['step', ['get', 'point_count'], 10, 12, 14, 20, 18],
          'circle-opacity': 0.65
        }
      });

      map.addLayer({
        id: 'event-points',
        type: 'circle',
        source: 'event-markers',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#a6b8c8',
          'circle-radius': 4.2,
          'circle-opacity': 0.8
        }
      });
    });

    map.on('moveend', () => {
      const center = map.getCenter();
      onViewportChange({ lat: center.lat, lon: center.lng, zoom: map.getZoom() });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [choropleth, eventGeoJson, lat, lon, onViewportChange, signalGeoJson, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const choroplethSource = map.getSource('risk-choropleth') as GeoJSONSource | undefined;
    choroplethSource?.setData(choropleth as any);

    const signalSource = map.getSource('signal-markers') as GeoJSONSource | undefined;
    signalSource?.setData(signalGeoJson as any);

    const eventSource = map.getSource('event-markers') as GeoJSONSource | undefined;
    eventSource?.setData(eventGeoJson as any);

    const choroplethVisible = layers.includes('choropleth') ? 'visible' : 'none';
    const signalsVisible = layers.includes('signals') ? 'visible' : 'none';
    const eventsVisible = layers.includes('events') ? 'visible' : 'none';

    setLayerVisibility(map, 'risk-fill', choroplethVisible);
    setLayerVisibility(map, 'risk-outline', choroplethVisible);
    setLayerVisibility(map, 'signal-clusters', signalsVisible);
    setLayerVisibility(map, 'signal-points', signalsVisible);
    setLayerVisibility(map, 'event-clusters', eventsVisible);
    setLayerVisibility(map, 'event-points', eventsVisible);
  }, [choropleth, eventGeoJson, layers, signalGeoJson]);

  return <div ref={containerRef} className="map-container" />;
};

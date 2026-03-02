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

const mapStyle = 'https://demotiles.maplibre.org/style.json';

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
      style: mapStyle,
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
            '#def5f0',
            35,
            '#8fd3c1',
            60,
            '#ffb367',
            85,
            '#ef476f'
          ],
          'fill-opacity': 0.35
        }
      });

      map.addLayer({
        id: 'risk-outline',
        type: 'line',
        source: 'risk-choropleth',
        paint: {
          'line-color': '#234',
          'line-opacity': 0.2,
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
          'circle-color': '#1f6feb',
          'circle-radius': ['step', ['get', 'point_count'], 13, 10, 17, 20, 21],
          'circle-opacity': 0.7
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
            '#2a9d8f',
            50,
            '#f4a261',
            100,
            '#e63946'
          ],
          'circle-radius': 6,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#0f172a'
        }
      });

      map.addLayer({
        id: 'event-clusters',
        type: 'circle',
        source: 'event-markers',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#6c757d',
          'circle-radius': ['step', ['get', 'point_count'], 10, 12, 14, 20, 18],
          'circle-opacity': 0.5
        }
      });

      map.addLayer({
        id: 'event-points',
        type: 'circle',
        source: 'event-markers',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#9aa5b1',
          'circle-radius': 4,
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

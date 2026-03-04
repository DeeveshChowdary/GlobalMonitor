import { useEffect, useMemo, useRef, useState } from 'react';
import type { Event, ModuleId, Signal, TimeRange, Timeseries } from '@gm/schema';
import { loadEvents, loadSignals, loadTimeseries } from './lib/api';
import { buildFallbackBundle } from './lib/fallback';
import { DetailPanel } from './components/DetailPanel';
import { MapPanel } from './components/MapPanel';
import { SignalList } from './components/SignalList';
import { TopNav } from './components/TopNav';
import { moduleRegistry } from './config/modules';
import { useUrlState } from './state/url-state';

const mergeUniqueLayers = (current: string[], layer: string) =>
  current.includes(layer) ? current.filter((value) => value !== layer) : [...current, layer];

function App() {
  const state = useUrlState();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [timeseries, setTimeseries] = useState<Timeseries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusNotes, setStatusNotes] = useState<string[]>([]);
  const bundleCacheRef = useRef(
    new Map<string, { signals: Signal[]; events: Event[]; timeseries: Timeseries[] }>()
  );

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `${state.module}:${state.timeRange}`;
    const cachedBundle = bundleCacheRef.current.get(cacheKey);

    if (cachedBundle) {
      setSignals(cachedBundle.signals);
      setEvents(cachedBundle.events);
      setTimeseries(cachedBundle.timeseries);
      setLoading(false);
    }

    const run = async () => {
      if (!cachedBundle) {
        setLoading(true);
      }
      setError(null);
      const [signalResult, eventResult, timeseriesResult] = await Promise.allSettled([
        loadSignals(state.module, state.timeRange),
        loadEvents(state.module, state.timeRange),
        loadTimeseries(state.module, state.timeRange)
      ]);

      if (cancelled) {
        return;
      }

      const notes: string[] = [];
      const readError = (value: unknown) =>
        value instanceof Error ? value.message : 'endpoint unavailable';
      const signalData = signalResult.status === 'fulfilled' ? signalResult.value.data : undefined;
      const eventData = eventResult.status === 'fulfilled' ? eventResult.value.data : undefined;
      const timeseriesData =
        timeseriesResult.status === 'fulfilled' ? timeseriesResult.value.data : undefined;

      if (signalResult.status === 'rejected') {
        notes.push(`Signals: ${readError(signalResult.reason)}`);
      } else if (signalResult.value.error) {
        notes.push(`Signals: ${signalResult.value.error}`);
      }

      if (eventResult.status === 'rejected') {
        notes.push(`Events: ${readError(eventResult.reason)}`);
      } else if (eventResult.value.error) {
        notes.push(`Events: ${eventResult.value.error}`);
      }

      if (timeseriesResult.status === 'rejected') {
        notes.push(`Timeseries: ${readError(timeseriesResult.reason)}`);
      } else if (timeseriesResult.value.error) {
        notes.push(`Timeseries: ${timeseriesResult.value.error}`);
      }

      let nextSignals = signalData ?? cachedBundle?.signals ?? [];
      let nextEvents = eventData ?? cachedBundle?.events ?? [];
      let nextTimeseries = timeseriesData ?? cachedBundle?.timeseries ?? [];

      if (nextSignals.length === 0 && nextEvents.length === 0 && nextTimeseries.length === 0) {
        const fallback = buildFallbackBundle(state.module, state.timeRange);
        nextSignals = fallback.signals;
        nextEvents = fallback.events;
        nextTimeseries = fallback.timeseries;
        notes.push('All live sources failed. Showing offline fallback monitors.');
      }

      setSignals(nextSignals);
      setEvents(nextEvents);
      setTimeseries(nextTimeseries);
      setStatusNotes(notes.slice(0, 3));
      setError(notes.length > 0 ? notes[0] : null);
      setLoading(false);

      bundleCacheRef.current.set(cacheKey, {
        signals: nextSignals,
        events: nextEvents,
        timeseries: nextTimeseries
      });
    };

    void run();
    const interval = setInterval(() => {
      void run();
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [state.module, state.timeRange]);

  const selectedSignal = useMemo(
    () => signals.find((signal) => signal.id === state.selectedSignalId) ?? signals[0],
    [signals, state.selectedSignalId]
  );

  useEffect(() => {
    if (signals.length === 0) {
      return;
    }

    const selectedExists = signals.some((signal) => signal.id === state.selectedSignalId);
    if (!state.selectedSignalId || !selectedExists) {
      state.setState({ selectedSignalId: signals[0].id });
    }
  }, [signals, state]);

  const selectedSeries = useMemo(() => {
    if (!selectedSignal) {
      return timeseries[0];
    }
    const primaryMetric = selectedSignal.metricIds[0];
    return timeseries.find((series) => series.metricId === primaryMetric) ?? timeseries[0];
  }, [selectedSignal, timeseries]);

  const relatedEvents = useMemo(() => {
    if (!selectedSignal) {
      return events;
    }

    if (selectedSignal.relatedEventIds.length > 0) {
      const matchedById = events.filter((event) =>
        selectedSignal.relatedEventIds.includes(event.id)
      );
      if (matchedById.length > 0) {
        return matchedById;
      }
    }

    if (selectedSignal.tags.length > 0) {
      const matchedByTag = events.filter((event) =>
        event.tags.some((tag) => selectedSignal.tags.includes(tag))
      );
      if (matchedByTag.length > 0) {
        return matchedByTag;
      }
    }

    return events;
  }, [events, selectedSignal]);

  const moduleConfig = moduleRegistry[state.module];

  return (
    <div className="app-shell">
      <TopNav
        module={state.module}
        timeRange={state.timeRange}
        summary={{
          score: selectedSignal?.score ?? 0,
          signalCount: signals.length,
          eventCount: events.length,
          degraded: statusNotes.length > 0
        }}
        onModuleChange={(module: ModuleId) => {
          state.setState({ module, selectedSignalId: undefined });
        }}
        onTimeRangeChange={(timeRange: TimeRange) => state.setState({ timeRange })}
      />

      {statusNotes.length > 0 ? (
        <section className="status-strip">
          <strong>Degraded mode</strong>
          <span>{statusNotes.join(' | ')}</span>
        </section>
      ) : null}

      <main className="content-grid">
        <SignalList
          signals={signals}
          timeseries={timeseries}
          selectedSignalId={selectedSignal?.id}
          onSelect={(signal) => state.setState({ selectedSignalId: signal.id })}
        />

        <section className="panel map-panel">
          <div className="panel-header">
            <h2>{moduleConfig.label}</h2>
            <div className="layer-controls">
              {['choropleth', 'signals', 'events'].map((layer) => (
                <button
                  key={layer}
                  type="button"
                  className={`layer-pill ${state.layers.includes(layer) ? 'active' : ''}`}
                  onClick={() => state.setState({ layers: mergeUniqueLayers(state.layers, layer) })}
                >
                  {layer}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading module data...</div>
          ) : signals.length === 0 && events.length === 0 ? (
            <div className="empty">
              No map overlays available for this module/time range yet. Try a wider range or check
              source status.
            </div>
          ) : (
            <MapPanel
              lat={state.lat}
              lon={state.lon}
              zoom={state.zoom}
              layers={state.layers}
              signals={signals}
              events={events}
              onViewportChange={(next) => state.setState(next)}
            />
          )}
        </section>

        <DetailPanel
          moduleLabel={moduleConfig.label}
          signal={selectedSignal}
          timeseries={selectedSeries}
          allTimeseries={timeseries}
          events={relatedEvents}
        />
      </main>
      {error ? <div className="error-banner">{error}</div> : null}
    </div>
  );
}

export default App;

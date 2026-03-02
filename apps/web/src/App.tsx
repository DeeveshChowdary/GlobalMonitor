import { useEffect, useMemo, useState } from 'react';
import type { Event, ModuleId, Signal, TimeRange, Timeseries } from '@gm/schema';
import { loadEvents, loadSignals, loadTimeseries } from './lib/api';
import { DetailPanel } from './components/DetailPanel';
import { MapPanel } from './components/MapPanel';
import { SignalList } from './components/SignalList';
import { TopNav } from './components/TopNav';
import { moduleRegistry } from './config/modules';
import { resetLayersForModule, useUrlState } from './state/url-state';

const mergeUniqueLayers = (current: string[], layer: string) =>
  current.includes(layer) ? current.filter((value) => value !== layer) : [...current, layer];

function App() {
  const state = useUrlState();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [timeseries, setTimeseries] = useState<Timeseries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [signalRes, eventRes, timeseriesRes] = await Promise.all([
          loadSignals(state.module, state.timeRange),
          loadEvents(state.module, state.timeRange),
          loadTimeseries(state.module, state.timeRange)
        ]);

        if (cancelled) {
          return;
        }

        setSignals(signalRes.data);
        setEvents(eventRes.data);
        setTimeseries(timeseriesRes.data);
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
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
    if (!state.selectedSignalId && signals.length > 0) {
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

  const moduleConfig = moduleRegistry[state.module];

  return (
    <div className="app-shell">
      <TopNav
        module={state.module}
        timeRange={state.timeRange}
        onModuleChange={(module: ModuleId) => {
          state.setState({ module, selectedSignalId: undefined });
          resetLayersForModule(module);
        }}
        onTimeRangeChange={(timeRange: TimeRange) => state.setState({ timeRange })}
      />

      <main className="content-grid">
        <SignalList
          signals={signals}
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
          ) : error ? (
            <div className="error">{error}</div>
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

        <DetailPanel signal={selectedSignal} timeseries={selectedSeries} events={events} />
      </main>
    </div>
  );
}

export default App;

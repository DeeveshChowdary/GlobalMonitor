import type { Signal, Timeseries } from '@gm/schema';
import { TimeSeriesChart } from './TimeSeriesChart';

type Props = {
  signals: Signal[];
  timeseries: Timeseries[];
  selectedSignalId?: string;
  onSelect: (signal: Signal) => void;
};

export const SignalList = ({ signals, timeseries, selectedSignalId, onSelect }: Props) => {
  const byMetric = new Map(timeseries.map((series) => [series.metricId, series]));

  return (
    <section className="panel signals-panel">
      <div className="panel-header">
        <h2>Signals</h2>
        <span>{signals.length}</span>
      </div>

      {signals.length === 0 ? (
        <div className="empty">
          No signals available for this module/time range. Try `30d` or `90d`, or wait for upstream
          refresh.
        </div>
      ) : (
        <div className="signals-list">
          {signals.map((signal) => (
            <button
              key={signal.id}
              className={`signal-item ${selectedSignalId === signal.id ? 'active' : ''}`}
              onClick={() => onSelect(signal)}
              type="button"
            >
              <div className="signal-main">
                <strong>{signal.title}</strong>
                <span className="signal-score">{signal.score.toFixed(1)}</span>
              </div>
              <div className="signal-meta">
                <span className={`badge severity-${Math.round(signal.severity / 20)}`}>
                  S {signal.severity.toFixed(0)}
                </span>
                <span className="badge">A {signal.acceleration.toFixed(1)}</span>
                <span className="badge">C {signal.confidence.toFixed(0)}</span>
              </div>
              <div className="signal-subline">
                <span>{signal.region ?? 'Global'}</span>
                <span>{signal.tags.slice(0, 2).join(' • ') || 'monitor'}</span>
              </div>
              <div className="signal-spark">
                <TimeSeriesChart series={byMetric.get(signal.metricIds[0])} compact />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

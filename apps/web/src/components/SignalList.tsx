import type { Signal } from '@gm/schema';

type Props = {
  signals: Signal[];
  selectedSignalId?: string;
  onSelect: (signal: Signal) => void;
};

export const SignalList = ({ signals, selectedSignalId, onSelect }: Props) => {
  return (
    <section className="panel signals-panel">
      <div className="panel-header">
        <h2>Signals</h2>
        <span>{signals.length}</span>
      </div>

      {signals.length === 0 ? (
        <div className="empty">
          No signals available for this module/time range. Try `30d` or `90d`, or wait for upstream refresh.
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
                <span className={`badge severity-${Math.round(signal.severity / 20)}`}>S {signal.severity.toFixed(0)}</span>
                <span className="badge">A {signal.acceleration.toFixed(1)}</span>
                <span className="badge">C {signal.confidence.toFixed(0)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

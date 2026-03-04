import type { ModuleId, TimeRange } from '@gm/schema';
import { moduleList } from '../config/modules';

type Props = {
  module: ModuleId;
  timeRange: TimeRange;
  summary: {
    signalCount: number;
    eventCount: number;
    score: number;
    degraded: boolean;
  };
  onModuleChange: (module: ModuleId) => void;
  onTimeRangeChange: (timeRange: TimeRange) => void;
};

const ranges: TimeRange[] = ['24h', '7d', '30d', '90d'];

export const TopNav = ({
  module,
  timeRange,
  summary,
  onModuleChange,
  onTimeRangeChange
}: Props) => {
  return (
    <header className="top-nav">
      <div className="brand">
        <h1>GLOBAL MONITOR OPS</h1>
        <p>{summary.degraded ? 'DEGRADED DATA PATH ACTIVE' : 'LIVE FEED MATRIX ACTIVE'}</p>
      </div>

      <div className="button-switcher">
        <label>Module</label>
        <div className="switcher-row">
          {moduleList.map((config) => (
            <button
              key={config.id}
              type="button"
              className={`switcher-btn ${module === config.id ? 'active' : ''}`}
              onClick={() => onModuleChange(config.id)}
            >
              {config.label}
            </button>
          ))}
        </div>
      </div>

      <div className="button-switcher">
        <label>Time Range</label>
        <div className="switcher-row">
          {ranges.map((range) => (
            <button
              key={range}
              type="button"
              className={`switcher-btn ${timeRange === range ? 'active' : ''}`}
              onClick={() => onTimeRangeChange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="nav-kpis">
        <div>
          <small>Score</small>
          <strong>{summary.score.toFixed(1)}</strong>
        </div>
        <div>
          <small>Signals</small>
          <strong>{summary.signalCount}</strong>
        </div>
        <div>
          <small>Events</small>
          <strong>{summary.eventCount}</strong>
        </div>
      </div>
    </header>
  );
};

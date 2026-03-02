import type { ModuleId, TimeRange } from '@gm/schema';
import { moduleList } from '../config/modules';

type Props = {
  module: ModuleId;
  timeRange: TimeRange;
  onModuleChange: (module: ModuleId) => void;
  onTimeRangeChange: (timeRange: TimeRange) => void;
};

const ranges: TimeRange[] = ['24h', '7d', '30d', '90d'];

export const TopNav = ({ module, timeRange, onModuleChange, onTimeRangeChange }: Props) => {
  return (
    <header className="top-nav">
      <div className="brand">
        <h1>Global Monitor</h1>
        <p>Free-first risk dashboard</p>
      </div>

      <div className="control-group">
        <label htmlFor="module-switcher">Module</label>
        <select
          id="module-switcher"
          value={module}
          onChange={(event) => onModuleChange(event.target.value as ModuleId)}
        >
          {moduleList.map((config) => (
            <option key={config.id} value={config.id}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label htmlFor="time-range">Time Range</label>
        <select
          id="time-range"
          value={timeRange}
          onChange={(event) => onTimeRangeChange(event.target.value as TimeRange)}
        >
          {ranges.map((range) => (
            <option key={range} value={range}>
              {range}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
};

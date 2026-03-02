import type { Timeseries } from '@gm/schema';

type Props = {
  series?: Timeseries;
};

export const TimeSeriesChart = ({ series }: Props) => {
  if (!series || series.points.length < 2) {
    return <div className="empty">No timeseries available for current selection.</div>;
  }

  const width = 420;
  const height = 180;
  const padding = 24;
  const min = Math.min(...series.points.map((point) => point.value));
  const max = Math.max(...series.points.map((point) => point.value));
  const span = max - min || 1;

  const points = series.points
    .map((point, index) => {
      const x = padding + (index / (series.points.length - 1)) * (width - padding * 2);
      const y = height - padding - ((point.value - min) / span) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="chart-wrap">
      <div className="chart-meta">
        <strong>{series.label}</strong>
        <span>{series.source}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label={series.label}>
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" />
      </svg>
      <div className="chart-axis">
        <span>{min.toFixed(2)}</span>
        <span>{max.toFixed(2)}</span>
      </div>
    </div>
  );
};

import type { Timeseries } from '@gm/schema';

type Props = {
  series?: Timeseries;
  compact?: boolean;
  className?: string;
};

export const TimeSeriesChart = ({ series, compact = false, className }: Props) => {
  if (!series || series.points.length < 2) {
    return <div className="empty">No timeseries available for current selection.</div>;
  }

  const width = compact ? 210 : 420;
  const height = compact ? 78 : 180;
  const padding = compact ? 10 : 24;
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
  const latest = series.points[series.points.length - 1]?.value ?? 0;
  const previous = series.points[Math.max(0, series.points.length - 2)]?.value ?? latest;
  const delta = latest - previous;
  const trendClass = delta >= 0 ? 'trend-up' : 'trend-down';

  return (
    <div className={`chart-wrap ${compact ? 'compact' : ''} ${className ?? ''}`.trim()}>
      {!compact ? (
        <div className="chart-meta">
          <strong>{series.label}</strong>
          <span>{series.source}</span>
        </div>
      ) : null}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`chart-svg ${trendClass}`}
        role="img"
        aria-label={series.label}
      >
        {!compact ? (
          <polyline
            points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
            fill="rgba(57, 255, 173, 0.09)"
            stroke="none"
          />
        ) : null}
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth={compact ? 2 : 2.5} />
      </svg>
      {!compact ? (
        <div className="chart-axis">
          <span>{min.toFixed(2)}</span>
          <span>{max.toFixed(2)}</span>
        </div>
      ) : null}
    </div>
  );
};

import type { Event, Signal, Timeseries } from '@gm/schema';
import { TimeSeriesChart } from './TimeSeriesChart';

type Props = {
  moduleLabel: string;
  signal?: Signal;
  timeseries?: Timeseries;
  allTimeseries: Timeseries[];
  events: Event[];
};

const eventTimelinePoints = (events: Event[], days = 30) => {
  const grouped = new Map<string, number>();
  for (const event of events) {
    const day = event.timestamp.slice(0, 10);
    grouped.set(day, (grouped.get(day) ?? 0) + 1);
  }

  const points: Array<{ day: string; count: number }> = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const cursor = new Date(Date.now() - index * 24 * 60 * 60 * 1000);
    const day = cursor.toISOString().slice(0, 10);
    points.push({ day, count: grouped.get(day) ?? 0 });
  }
  return points;
};

const EventTimeline = ({ events }: { events: Event[] }) => {
  const points = eventTimelinePoints(events, 30);
  const width = 420;
  const height = 96;
  const padding = 12;
  const max = Math.max(1, ...points.map((point) => point.count));
  const barWidth = (width - padding * 2) / points.length;

  return (
    <div className="timeline-wrap">
      <div className="timeline-head">
        <strong>Event Intensity (30D)</strong>
        <span>{points.reduce((acc, point) => acc + point.count, 0)} events</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="timeline-svg" role="img" aria-label="Event intensity">
        {points.map((point, index) => {
          const barHeight = (point.count / max) * (height - padding * 2);
          const x = padding + index * barWidth + 1;
          const y = height - padding - barHeight;
          return (
            <rect
              key={point.day}
              x={x}
              y={y}
              width={Math.max(1, barWidth - 2)}
              height={barHeight}
              rx={1}
              fill={point.count > 0 ? '#39ffad' : 'rgba(87, 111, 136, 0.25)'}
              opacity={point.count > 0 ? 0.85 : 0.4}
            />
          );
        })}
      </svg>
    </div>
  );
};

export const DetailPanel = ({ moduleLabel, signal, timeseries, allTimeseries, events }: Props) => {
  const primaryMetric = signal?.metricIds[0];
  const secondarySeries = allTimeseries
    .filter((series) => series.points.length > 1 && series.metricId !== primaryMetric)
    .slice(0, 3);

  return (
    <section className="panel detail-panel">
      <div className="panel-header">
        <h2>{moduleLabel} Analytics</h2>
      </div>

      {signal ? (
        <article className="signal-detail">
          <h3>{signal.title}</h3>
          <p>{signal.description}</p>
          <div className="detail-kpi-grid">
            <div className="detail-kpi">
              <small>Severity</small>
              <strong>{signal.severity.toFixed(1)}</strong>
            </div>
            <div className="detail-kpi">
              <small>Acceleration</small>
              <strong>{signal.acceleration.toFixed(1)}</strong>
            </div>
            <div className="detail-kpi">
              <small>Confidence</small>
              <strong>{signal.confidence.toFixed(1)}</strong>
            </div>
            <div className="detail-kpi">
              <small>Composite Score</small>
              <strong>{signal.score.toFixed(1)}</strong>
            </div>
          </div>
        </article>
      ) : (
        <div className="empty">Select a signal to inspect breakdown and related feed.</div>
      )}

      <TimeSeriesChart series={timeseries} />

      {secondarySeries.length > 0 ? (
        <div className="chart-grid">
          {secondarySeries.map((series) => (
            <article key={series.id} className="mini-chart-card">
              <header>
                <strong>{series.label}</strong>
                <span>{series.source}</span>
              </header>
              <TimeSeriesChart series={series} compact className="mini-chart" />
            </article>
          ))}
        </div>
      ) : null}

      <EventTimeline events={events} />

      <div className="events-list">
        <h3>What Changed</h3>
        {events.length === 0 ? (
          <div className="empty">No events in the selected window.</div>
        ) : (
          events.slice(0, 10).map((event) => (
            <article key={event.id} className="event-item">
              <strong>{event.title}</strong>
              <p>{event.summary ?? 'No summary available.'}</p>
              <small>{new Date(event.timestamp).toLocaleString()}</small>
            </article>
          ))
        )}
      </div>
    </section>
  );
};

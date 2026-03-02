import type { Event, Signal, Timeseries } from '@gm/schema';
import { TimeSeriesChart } from './TimeSeriesChart';

type Props = {
  signal?: Signal;
  timeseries?: Timeseries;
  events: Event[];
};

export const DetailPanel = ({ signal, timeseries, events }: Props) => {
  return (
    <section className="panel detail-panel">
      <div className="panel-header">
        <h2>Details</h2>
      </div>

      {signal ? (
        <article className="signal-detail">
          <h3>{signal.title}</h3>
          <p>{signal.description}</p>
          <div className="detail-row">
            <span>Severity: {signal.severity.toFixed(1)}</span>
            <span>Acceleration: {signal.acceleration.toFixed(1)}</span>
            <span>Confidence: {signal.confidence.toFixed(1)}</span>
          </div>
        </article>
      ) : (
        <div className="empty">Select a signal to inspect breakdown and related feed.</div>
      )}

      <TimeSeriesChart series={timeseries} />

      <div className="events-list">
        <h3>What Changed</h3>
        {events.length === 0 ? (
          <div className="empty">No events in the selected window.</div>
        ) : (
          events.slice(0, 8).map((event) => (
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

import { fmtDuration, fmtLongDate, fmtTime, minutesBetween } from "../utils";

export default function TripCard({ booking: b }) {
  const mins = minutesBetween(b.departure_time, b.arrival_time);
  return (
    <section className="summary-card">
      <h2>Trip summary</h2>
      <div className="sc-body">
        <div className="sc-top">
          <span className="tag">Flight {b.flight_number}</span>
          <span className="muted">{b.booking_reference}</span>
        </div>
        <div className="sc-stop">
          <time>{fmtTime(b.departure_time)}</time>
          <span className="muted">{fmtLongDate(b.departure_time)}</span>
          <strong>{b.from_city} ({b.from_code})</strong>
        </div>
        <div className="sc-dur">Travel time {fmtDuration(mins)}</div>
        <div className="sc-stop">
          <time>{fmtTime(b.arrival_time)}</time>
          <span className="muted">{fmtLongDate(b.arrival_time)}</span>
          <strong>{b.to_city} ({b.to_code})</strong>
        </div>
      </div>
    </section>
  );
}

import { fmtDuration, fmtLongDate, fmtTime, minutesBetween } from "../utils";

export default function FlightSummary({ search, flight, cabin, pax }) {
  const mins = minutesBetween(flight.departure_time, flight.arrival_time);
  return (
    <section className="summary-card">
      <h2>Flight summary</h2>
      <div className="pax-pill">{pax} {pax === 1 ? "Passenger" : "Passengers"}</div>
      <div className="sc-body">
        <div className="sc-top">
          <span className="tag">{cabin}</span>
          <span className="muted">{flight.airline_name}</span>
        </div>
        <div className="sc-stop">
          <time>{fmtTime(flight.departure_time)}</time>
          <span className="muted">{fmtLongDate(flight.departure_time)}</span>
          <strong>{search.from.city}</strong>
          <small>{search.from.name}</small>
        </div>
        <div className="sc-dur">Travel time {fmtDuration(mins)}</div>
        <div className="sc-stop">
          <time>{fmtTime(flight.arrival_time)}</time>
          <span className="muted">{fmtLongDate(flight.arrival_time)}</span>
          <strong>{search.to.city}</strong>
          <small>{search.to.name}</small>
        </div>
      </div>
    </section>
  );
}

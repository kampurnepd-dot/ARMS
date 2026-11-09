import { Navigate, useNavigate } from "react-router-dom";
import { useSearch } from "../context/SearchContext";
import { useBooking } from "../context/BookingContext";
import { fmtLongDate, fmtPrice, fmtTime } from "../utils";

export default function ConfirmationPage() {
  const { search } = useSearch();
  const { selection, passengers, booking, seats, reset } = useBooking();
  const navigate = useNavigate();

  if (!search || !selection || !booking || !seats) return <Navigate to="/" replace />;

  const f = selection.flight;
  const total = Number(seats.total_amount ?? booking.total);

  return (
    <main className="page confirm">
      <div className="form-card">
        <p className="green">Seats reserved</p>
        <h1>Booking {booking.reference}</h1>
        <p className="muted">
          Your seats are held until {fmtTime(new Date(booking.expiresAt))}. Keep your booking reference handy.
        </p>

        <div className="confirm-route">
          <div>
            <time>{fmtTime(f.departure_time)}</time>
            <strong>{search.from.city} ({search.from.airport_code})</strong>
            <small>{fmtLongDate(f.departure_time)}</small>
          </div>
          <span className="muted">{f.airline_name} · {selection.cabin}</span>
          <div>
            <time>{fmtTime(f.arrival_time)}</time>
            <strong>{search.to.city} ({search.to.airport_code})</strong>
            <small>{fmtLongDate(f.arrival_time)}</small>
          </div>
        </div>

        <h2>Passengers</h2>
        <ul className="confirm-list">
          {passengers.map((p, i) => (
            <li key={i}>
              <span>{`${p.first} ${p.last}`.trim()} <small className="muted">({p.type})</small></span>
              <strong>Seat {seats.seats[i]?.seat_number ?? "auto-assigned"}</strong>
            </li>
          ))}
        </ul>

        <div className="confirm-total">
          <span>Total</span>
          <strong>{fmtPrice(total)}</strong>
        </div>

        <button
          className="primary"
          onClick={() => {
            reset();
            navigate("/");
          }}
        >
          Book another flight
        </button>
      </div>
    </main>
  );
}

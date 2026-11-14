import { formatDateTime } from "../paymentUtils";

export default function TripBar({ booking, count }) {
  const cells = [
    ["From", booking.from_city, booking.from_code],
    ["To", booking.to_city, booking.to_code],
    ["Departure", formatDateTime(booking.departure_time), booking.flight_number],
    ["Travellers", `${count} Passenger${count > 1 ? "s" : ""}`, `PNR ${booking.booking_reference}`],
  ];
  return (
    <div className="pm-bar">
      {cells.map(([label, value, sub]) => (
        <div className="pm-cell" key={label}>
          <span className="pm-label">{label}</span>
          <strong>{value}</strong>
          <span className="pm-sub">{sub}</span>
        </div>
      ))}
    </div>
  );
}

import { useEffect } from "react";
import { fmtDuration, fmtPrice, fmtTime, minutesBetween } from "../utils";

export default function FareModal({ flight, cabin, search, pax, onConfirm, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const price = flight.cabins[cabin].price;
  const mins = minutesBetween(flight.departure_time, flight.arrival_time);

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="fm-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
        <p className="muted">You’re choosing the {cabin} fare</p>
        <h2 id="fm-title">{search.from.city} → {search.to.city}</h2>

        <div className="modal-card">
          <strong>{flight.airline_name}</strong>
          <span>
            {fmtTime(flight.departure_time)} {search.from.airport_code} – {fmtTime(flight.arrival_time)} {search.to.airport_code}
            <small> · {fmtDuration(mins)}</small>
          </span>
        </div>

        <div className="modal-price">
          <strong>{fmtPrice(price)}</strong>
          <span className="muted">per passenger</span>
          {pax > 1 && <span className="green">{fmtPrice(price * pax)} for {pax} passengers</span>}
        </div>

        <button className="primary wide" autoFocus onClick={onConfirm}>Confirm &amp; Proceed</button>
        <button className="ghost wide" onClick={onClose}>Change fare</button>
      </div>
    </div>
  );
}

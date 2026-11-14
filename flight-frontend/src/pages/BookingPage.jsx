import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getRefund, getSummary } from "../api";
import { useBooking } from "../context/BookingContext";
import TripCard from "../components/TripCard";
import CancelModal from "../components/CancelModal";
import { fmtPrice } from "../utils";

const BADGE = { Confirmed: "ok", Completed: "ok", Pending: "warn", Cancelled: "bad", Expired: "bad" };

export default function BookingPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { reset } = useBooking();

  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | done | error | expired
  const [error, setError] = useState("");
  const [refunds, setRefunds] = useState({}); // cancellation_id -> refund
  const [target, setTarget] = useState(null); // passengers (tickets) shown in the cancel dialog
  const [flash, setFlash] = useState(state?.paid ? "Payment successful. Your booking is confirmed." : "");

  const load = useCallback(async () => {
    try {
      const d = await getSummary();
      setData(d);
      setStatus("done");
      const cancelled = d.passengers.filter((p) => p.cancellation_id && p.ticket_status === "Cancelled");
      const found = await Promise.all(
        cancelled.map((p) => getRefund(p.cancellation_id).then((r) => [p.cancellation_id, r]).catch(() => null))
      );
      setRefunds(Object.fromEntries(found.filter(Boolean)));
    } catch (e) {
      if (e.code === "session_expired") return setStatus("expired");
      setError(e.message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
    if (state?.paid) reset(); // the checkout is finished, clear the saved selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  if (status === "loading") return <main className="page"><div className="skeleton" style={{ height: 320 }} /></main>;

  if (status === "expired") {
    return (
      <main className="page">
        <div className="notice">
          <h3>Your session has expired</h3>
          <p>Enter your booking reference and email on the home page to open your booking again.</p>
          <Link className="primary link-btn" to="/?tab=manage">Find my booking</Link>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="page">
        <div className="notice">
          <h3>We couldn’t load your booking</h3>
          <p>{error}</p>
          <button className="primary" onClick={load}>Try again</button>
        </div>
      </main>
    );
  }

  const { booking: b, passengers } = data;
  const cancellable = passengers.filter((p) => p.ticket_id && p.ticket_status === "Issued" && !p.cancellation_id);
  const windowOpen = new Date(b.departure_time).getTime() - Date.now() > 3 * 60 * 60 * 1000;
  const canCancel = b.booking_status === "Confirmed" && windowOpen && cancellable.length > 0;

  const finished = async () => {
    setTarget(null);
    setFlash("Your cancellation has been processed.");
    await load();
    setTimeout(load, 2500); // pick up the refund once the worker has processed it
  };

  const ticketLabel = (p) => {
    if (p.ticket_status === "Cancelled") return <span className="badge bad">Cancelled</span>;
    if (p.cancellation_id) return <span className="badge warn">Cancellation requested</span>;
    if (p.ticket_status) return <span className="badge ok">{p.ticket_status}</span>;
    return <span className="badge warn">Not issued</span>;
  };

  return (
    <main className="page checkout">
      <div className="checkout-main">
        <div className="seat-head">
          <h1>Booking {b.booking_reference}</h1>
          <span className={`badge big ${BADGE[b.booking_status] ?? "warn"}`}>{b.booking_status}</span>
        </div>

        {flash && <p className="flash" role="status">{flash}</p>}

        {b.booking_status === "Pending" && (
          <div className="notice left">
            <h3>Payment pending</h3>
            <p>Complete the payment to confirm your seats.</p>
            <button className="primary" onClick={() => navigate("/payment")}>Pay now</button>
          </div>
        )}

        <section className="form-card">
          <h2>Passengers</h2>
          <ul className="t-list">
            {passengers.map((p, i) => {
              const refund = refunds[p.cancellation_id];
              const canRow = canCancel && cancellable.includes(p);
              return (
                <li className="t-row" key={p.ticket_id ?? i}>
                  <div>
                    <strong>{p.passenger_name}</strong>
                    <small>{p.ticket_number ? `Ticket ${p.ticket_number}` : "Ticket not issued yet"}</small>
                    {p.ticket_status === "Cancelled" && (
                      <small className="refund">
                        {refund ? `Refund ${fmtPrice(Number(refund.amount))} · ${refund.refund_status}` : "No refund due"}
                      </small>
                    )}
                  </div>
                  <div>{p.seat_number ? `Seat ${p.seat_number}` : "No seat"}</div>
                  <div>{ticketLabel(p)}</div>
                  <div className="t-act">
                    {canRow && <button className="link-danger" onClick={() => setTarget([p])}>Cancel</button>}
                  </div>
                </li>
              );
            })}
          </ul>

          {b.booking_status === "Confirmed" && !windowOpen && (
            <p className="muted">Cancellation closes 3 hours before departure.</p>
          )}

          <div className="row-actions">
            {canCancel && cancellable.length > 1 && (
              <button className="danger" onClick={() => setTarget(cancellable)}>Cancel entire booking</button>
            )}
            <button className="ghost" onClick={() => navigate("/")}>Back to home</button>
          </div>
        </section>
      </div>

      <aside>
        <TripCard booking={b} />
        <div className="summary-card total-card">
          <span>{b.booking_status === "Confirmed" ? "Total paid" : "Total"}</span>
          <strong>{fmtPrice(Number(b.total_amount))}</strong>
        </div>
      </aside>

      {target && (
        <CancelModal
          tickets={target}
          onClose={() => setTarget(null)}
          onFinished={finished}
          onExpired={() => { setTarget(null); setStatus("expired"); }}
        />
      )}
    </main>
  );
}

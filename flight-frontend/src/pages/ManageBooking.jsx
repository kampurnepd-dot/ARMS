import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getBookingSummary, cancelTicket } from "../paymentApi";
import { AUTO_APPROVE, CANCEL_CUTOFF_HOURS, formatINR, hoursUntil, ticketAmount } from "../paymentUtils";
import PageShell, { LoadError } from "../components/PageShell";
import TripBar from "../components/TripBar";
import StatusBadge from "../components/StatusBadge";
import CancelDialog from "../components/CancelDialog";

export default function ManageBooking() {
  const nav = useNavigate();
  const [data, setData] = useState(null);       // { booking, passengers }
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);   // { ticket } or { all: true }
  const [dialogError, setDialogError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);   // { text, id }

  const load = () => getBookingSummary().then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  if (!data) {
    return (
      <PageShell title="Manage your booking.">
        {error ? <LoadError message={error} onHome={() => nav("/")} /> : <p className="pm-sub">Loading your booking…</p>}
      </PageShell>
    );
  }

  const { booking, passengers } = data;
  const beforeCutoff = hoursUntil(booking.departure_time) > CANCEL_CUTOFF_HOURS;
  const canCancel = (p) => p.ticket_status === "Issued" && beforeCutoff;
  const active = passengers.filter(canCancel);
  const sum = (list) => list.reduce((s, p) => s + ticketAmount(p), 0);

  function open(d) {
    setDialogError("");
    setDialog(d);
  }

  async function confirm(reason) {
    const targets = dialog.all ? active : [dialog.ticket];
    setBusy(true);
    setDialogError("");
    let last = null;
    try {
      for (const p of targets) {                 // one ticket at a time, same as the backend
        last = await cancelTicket(p.ticket_id, reason, AUTO_APPROVE);
      }
      setDialog(null);
      setNotice({
        text: `Cancelled. ${formatINR(sum(targets))} will be refunded to your original payment method.`,
        id: last.cancellation_id,
      });
    } catch (e) {
      setDialogError(e.message);
    } finally {
      setBusy(false);
      load();                                    // refresh statuses, even after a partial failure
    }
  }

  return (
    <PageShell
      title="Manage your booking."
      subtitle={<>PNR {booking.booking_reference} <StatusBadge status={booking.booking_status} /></>}
    >
      <section className="pm-card">
        <TripBar booking={booking} count={passengers.length} />

        {notice && (
          <div className="pm-notice">
            {notice.text} <Link className="pm-link" to={`/refund/${notice.id}`}>Track refund</Link>
          </div>
        )}

        <div className="pm-row-head">
          <h2 className="pm-h2">Passengers</h2>
          {active.length > 1 && (
            <button className="pm-btn danger small" onClick={() => open({ all: true })}>Cancel entire booking</button>
          )}
        </div>

        {passengers.map((p) => (
          <div className="pm-ticket" key={p.ticket_id || p.passenger_name + p.seat_number}>
            <div>
              <strong>{p.passenger_name}</strong>
              <div className="pm-sub">Seat {p.seat_number || "—"} · {p.ticket_number || "Ticket pending"}</div>
            </div>
            <div className="pm-ticket-end">
              <StatusBadge status={p.ticket_status || "Pending"} />
              <strong>{formatINR(ticketAmount(p))}</strong>
              {canCancel(p) && (
                <button className="pm-btn danger small outline" onClick={() => open({ ticket: p })}>Cancel ticket</button>
              )}
              {p.cancellation_id && (
                <Link className="pm-link" to={`/refund/${p.cancellation_id}`}>Track refund</Link>
              )}
            </div>
          </div>
        ))}

        {!beforeCutoff && (
          <p className="pm-sub">Cancellation closes {CANCEL_CUTOFF_HOURS} hours before departure.</p>
        )}

        <div className="pm-foot">
          <button className="pm-btn ghost" onClick={() => nav("/")}>Back to home</button>
        </div>
      </section>

      {dialog && (
        <CancelDialog
          title={dialog.all ? "Cancel entire booking" : `Cancel ticket for ${dialog.ticket.passenger_name}`}
          amount={dialog.all ? sum(active) : ticketAmount(dialog.ticket)}
          busy={busy}
          error={dialogError}
          onConfirm={confirm}
          onClose={() => setDialog(null)}
        />
      )}
    </PageShell>
  );
}

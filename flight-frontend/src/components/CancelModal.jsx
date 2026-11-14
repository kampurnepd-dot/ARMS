import { useEffect, useState } from "react";
import { AUTO_APPROVE, cancelTicket } from "../api";

const REASONS = ["Change of plans", "Booked by mistake", "Found a cheaper fare", "Medical emergency", "Other"];

export default function CancelModal({ tickets, onClose, onFinished, onExpired }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);

  const close = () => {
    if (results) onFinished();
    else if (!busy) onClose();
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const run = async () => {
    setBusy(true);
    const text = note.trim() ? `${reason}: ${note.trim()}` : reason;
    const out = [];
    for (const t of tickets) {
      try {
        const r = await cancelTicket(t.ticket_id, text);
        out.push({ t, ok: true, r });
      } catch (e) {
        if (e.code === "session_expired") return onExpired();
        out.push({ t, ok: false, message: e.message });
      }
    }
    setResults(out);
    setBusy(false);
  };

  return (
    <div className="backdrop" onClick={close}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="cm-title" onClick={(e) => e.stopPropagation()}>
        {!busy && <button className="modal-x" onClick={close} aria-label="Close">×</button>}

        {!results && (
          <>
            <h2 id="cm-title">Cancel {tickets.length === 1 ? "ticket" : `${tickets.length} tickets`}?</h2>
            <ul className="cancel-list">
              {tickets.map((t) => (
                <li key={t.ticket_id}>{t.passenger_name}{t.seat_number ? ` · Seat ${t.seat_number}` : ""}</li>
              ))}
            </ul>
            <label className="ff">
              <span>Reason</span>
              <select value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy}>
                {REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label className="ff" style={{ marginTop: 12 }}>
              <span>Add a note (optional)</span>
              <textarea rows={2} value={note} maxLength={150} onChange={(e) => setNote(e.target.value)} disabled={busy} />
            </label>
            <p className="note" style={{ marginTop: 16 }}>
              Cancelled seats are released straight away. If you already paid, a refund is started for each cancelled ticket.
            </p>
            <button className="danger wide" disabled={busy} onClick={run}>
              {busy ? "Cancelling…" : "Yes, cancel"}
            </button>
            <button className="ghost wide" disabled={busy} onClick={onClose}>Keep my booking</button>
          </>
        )}

        {results && (
          <>
            <h2 id="cm-title">Cancellation result</h2>
            <ul className="cancel-list">
              {results.map(({ t, ok, r, message }) => (
                <li key={t.ticket_id} className={ok ? "" : "bad"}>
                  <strong>{t.passenger_name}</strong>
                  <span>
                    {!ok && message}
                    {ok && !r.completed && "Cancellation requested, waiting for approval"}
                    {ok && r.completed && (r.refund_status === "Requested" ? "Cancelled · refund started" : "Cancelled · no payment to refund")}
                  </span>
                </li>
              ))}
            </ul>
            {!AUTO_APPROVE && <p className="muted">You’ll see the final status here once the request is approved.</p>}
            <button className="primary wide" onClick={onFinished}>Done</button>
          </>
        )}
      </div>
    </div>
  );
}

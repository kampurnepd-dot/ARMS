import { useState } from "react";
import { formatINR } from "../paymentUtils";

const REASONS = ["Change of plans", "Found a better fare", "Personal emergency", "Booked by mistake", "Other"];

export default function CancelDialog({ title, amount, busy, error, onConfirm, onClose }) {
  const [reason, setReason] = useState("");

  return (
    <div className="pm-overlay" onClick={busy ? undefined : onClose}>
      <div className="pm-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <label className="pm-label" htmlFor="cancel-reason">Reason for cancelling</label>
        <select id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Select a reason</option>
          {REASONS.map((r) => <option key={r}>{r}</option>)}
        </select>
        <div className="pm-refund-line"><span>You’ll get back</span><strong>{formatINR(amount)}</strong></div>
        <p className="pm-sub">The refund goes to your original payment method. Cancelled seats can’t be restored.</p>
        {error && <p className="pm-error">{error}</p>}
        <div className="pm-actions">
          <button className="pm-btn ghost" onClick={onClose} disabled={busy}>Keep booking</button>
          <button className="pm-btn danger" disabled={!reason || busy} onClick={() => onConfirm(reason)}>
            {busy ? "Cancelling…" : "Confirm cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}

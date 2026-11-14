import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { lookupBooking } from "../api";

export default function ManageForm() {
  const navigate = useNavigate();
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const valid = reference.trim().length >= 4 && /^\S+@\S+\.\S+$/.test(email.trim());

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError("");
    try {
      await lookupBooking({ booking_reference: reference.trim().toUpperCase(), email: email.trim() });
      navigate("/booking");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="search-card" onSubmit={submit}>
      <div className="manage-row">
        <div className="field">
          <label htmlFor="ref">Booking reference</label>
          <input id="ref" value={reference} placeholder="e.g. PNR1A2B3C4" autoComplete="off"
                 onChange={(e) => setReference(e.target.value.toUpperCase())} />
          <span className="sub">Sent to you after booking</span>
        </div>
        <div className="field">
          <label htmlFor="mail">Email used for the booking</label>
          <input id="mail" type="email" value={email} placeholder="name@example.com" autoComplete="email"
                 onChange={(e) => setEmail(e.target.value)} />
          <span className="sub">Contact email of the booking</span>
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="search-actions">
        <button className="primary" disabled={!valid || busy}>{busy ? "Searching…" : "Find booking"}</button>
      </div>
    </form>
  );
}

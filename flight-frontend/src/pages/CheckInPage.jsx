import { useEffect, useState } from "react";
import "../admin.css";
import "../admin-ops.css";
import AdminNotice from "../components/AdminNotice";
import { checkInPassenger, getAirportList, getBoardingPass, getCounters, markBoarded } from "../adminOpsApi";
import { fmtDateTime, isId } from "../adminUtils";

const none = { ok: "", err: "" };

export default function CheckInPage() {
  const [airports, setAirports] = useState([]);
  const [airportId, setAirportId] = useState("");
  const [counters, setCounters] = useState([]);
  const [counterId, setCounterId] = useState("");
  const [reservationId, setReservationId] = useState("");
  const [msg, setMsg] = useState(none);
  const [busy, setBusy] = useState(false);

  const [passId, setPassId] = useState("");
  const [pass, setPass] = useState(null);
  const [passMsg, setPassMsg] = useState(none);

  useEffect(() => {
    getAirportList().then(setAirports).catch((e) => setMsg({ ok: "", err: e.message }));
  }, []);

  useEffect(() => {
    setCounterId("");
    if (!airportId) return setCounters([]);
    getCounters(airportId).then(setCounters).catch((e) => setMsg({ ok: "", err: e.message }));
  }, [airportId]);

  const loadPass = async (id) => {
    try {
      setPass(await getBoardingPass(id));
    } catch (e) {
      setPass(null);
      setPassMsg({ ok: "", err: e.message });
    }
  };

  const submitCheckIn = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(none);
    try {
      const r = await checkInPassenger({
        reservationId: Number(reservationId),
        counterId: counterId ? Number(counterId) : null,
      });
      setMsg({ ok: `Check-in successful. Boarding pass ${r.boardingPassNumber} (check-in #${r.checkinId}).`, err: "" });
      setReservationId("");
      setPassId(String(r.checkinId));
      setPassMsg(none);
      await loadPass(r.checkinId);
    } catch (err) {
      setMsg({ ok: "", err: err.message });
    } finally {
      setBusy(false);
    }
  };

  const findPass = async (e) => {
    e.preventDefault();
    setPassMsg(none);
    await loadPass(Number(passId));
  };

  const board = async () => {
    setBusy(true);
    try {
      const r = await markBoarded(pass.checkin_id);
      await loadPass(pass.checkin_id);
      setPassMsg({ ok: r.message, err: "" });
    } catch (err) {
      setPassMsg({ ok: "", err: err.message });
    } finally {
      setBusy(false);
    }
  };

  const boarded = pass?.boarding_status === "Boarded";

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">AIRPORT OPERATIONS</span>
          <h1>Check-in &amp; Boarding</h1>
          <p>Check passengers in, view boarding passes and mark passengers as boarded.</p>
        </div>
      </div>

      <section className="admin-card">
        <h2>Check in a passenger</h2>
        <p className="ops-hint">
          The ticket must be issued (payment done) and the flight must be Scheduled or Boarding. Leave the counter empty for online check-in.
        </p>
        <AdminNotice success={msg.ok} error={msg.err} />
        <form onSubmit={submitCheckIn}>
          <div className="admin-form-grid">
            <label>
              Departure airport (to list counters)
              <select value={airportId} onChange={(e) => setAirportId(e.target.value)}>
                <option value="">Select airport</option>
                {airports.map((a) => (
                  <option key={a.airport_id} value={a.airport_id}>{a.city} ({a.airport_code})</option>
                ))}
              </select>
            </label>
            <label>
              Open counter
              <select value={counterId} onChange={(e) => setCounterId(e.target.value)} disabled={!airportId}>
                <option value="">No counter (online check-in)</option>
                {counters.map((c) => (
                  <option key={c.counter_id} value={c.counter_id}>Counter {c.counter_number} · Terminal {c.terminal_id}</option>
                ))}
              </select>
            </label>
            <label className="admin-full-width">
              Seat reservation ID
              <input
                inputMode="numeric"
                value={reservationId}
                onChange={(e) => setReservationId(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 12"
              />
            </label>
          </div>
          {airportId && counters.length === 0 && <p className="ops-empty">No open counters at this airport.</p>}
          <div className="admin-actions">
            <button className="admin-primary" disabled={!isId(reservationId) || busy}>
              {busy ? "Checking in…" : "Check in"}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <h2>Boarding pass</h2>
        <AdminNotice success={passMsg.ok} error={passMsg.err} />
        <form onSubmit={findPass}>
          <div className="admin-form-grid">
            <label>
              Check-in ID
              <input inputMode="numeric" value={passId} onChange={(e) => setPassId(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 3" />
            </label>
          </div>
          <div className="admin-actions">
            <button className="admin-secondary" disabled={!isId(passId)}>View boarding pass</button>
          </div>
        </form>

        {pass && (
          <>
            <div className="ops-pass">
              <div className="ops-pass-main">
                <h3>{pass.full_name}</h3>
                <span className="muted">Ticket {pass.ticket_number}{pass.passport_number ? ` · Passport ${pass.passport_number}` : ""}</span>
                <div className="ops-pass-times">
                  <div><time>{fmtDateTime(pass.departure_time)}</time><span>Departs</span></div>
                  <div><time>{fmtDateTime(pass.arrival_time)}</time><span>Arrives</span></div>
                </div>
                <span className={`ops-badge ${boarded ? "ok" : "warn"}`}>{pass.boarding_status}</span>{" "}
                <span className="ops-badge">{pass.checkin_status}</span>
                {pass.boarded_at && <p className="ops-hint" style={{ marginTop: 10 }}>Boarded at {fmtDateTime(pass.boarded_at)}</p>}
              </div>
              <div className="ops-pass-side">
                <small>Flight</small>
                <strong>{pass.flight_number}</strong>
                <small>Seat</small>
                <strong>{pass.seat_number}</strong>
                <small>{pass.boarding_pass_number}</small>
              </div>
            </div>

            {pass.boarding_status === "Not Boarded" && (
              <div className="admin-actions">
                <button className="admin-primary" disabled={busy} onClick={board}>
                  {busy ? "Updating…" : "Mark as boarded"}
                </button>
              </div>
            )}
            {pass.boarding_status === "Not Boarded" && (
              <p className="ops-hint" style={{ marginTop: 12 }}>
                Boarding only works while the flight status is “Boarding”. Change it on the Flight Status page first.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
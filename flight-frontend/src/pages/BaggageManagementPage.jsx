import { useState } from "react";
import "../admin.css";
import "../admin-ops.css";
import AdminNotice from "../components/AdminNotice";
import { getBaggage, getBaggageHistory, registerBaggage, updateBaggageStatus } from "../adminOpsApi";
import { fmtDateTime, isId, randomTag } from "../adminUtils";

const TYPES = ["Checked", "Cabin", "Oversized"];
const STATUSES = ["Checked-In", "Screened", "Loaded", "In Transit", "Arrived", "Delivered", "Lost"];
const blank = { reservationId: "", scheduleId: "", tagNumber: "", weightKg: "", baggageType: "Checked" };
const none = { ok: "", err: "" };

const tone = (s) => (s === "Lost" ? "bad" : s === "Delivered" || s === "Arrived" ? "ok" : s === "Checked-In" ? "" : "warn");

export default function BaggageManagementPage() {
  const [form, setForm] = useState(blank);
  const [reg, setReg] = useState(none);
  const [busy, setBusy] = useState(false);

  const [lookupId, setLookupId] = useState("");
  const [bag, setBag] = useState(null);
  const [history, setHistory] = useState([]);
  const [find, setFind] = useState(none);
  const [upd, setUpd] = useState({ status: "Screened", location: "" });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const formOk =
    isId(form.reservationId) && isId(form.scheduleId) && form.tagNumber.trim() && Number(form.weightKg) > 0;

  const loadBag = async (id) => {
    try {
      const [b, h] = await Promise.all([getBaggage(id), getBaggageHistory(id)]);
      setBag(b);
      setHistory(h);
      setUpd((u) => ({ ...u, status: b.baggage_status }));
      return true;
    } catch (e) {
      setBag(null);
      setHistory([]);
      setFind({ ok: "", err: e.message });
      return false;
    }
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setBusy(true);
    setReg(none);
    try {
      const r = await registerBaggage({
        reservationId: Number(form.reservationId),
        scheduleId: Number(form.scheduleId),
        tagNumber: form.tagNumber.trim(),
        weightKg: Number(form.weightKg),
        baggageType: form.baggageType,
      });
      setReg({ ok: `Baggage registered. ID ${r.baggageId}, tag ${r.tagNumber}.`, err: "" });
      setForm(blank);
      setLookupId(String(r.baggageId));
      setFind(none);
      await loadBag(r.baggageId);
    } catch (err) {
      setReg({ ok: "", err: err.message });
    } finally {
      setBusy(false);
    }
  };

  const submitFind = async (e) => {
    e.preventDefault();
    setFind(none);
    await loadBag(Number(lookupId));
  };

  const submitUpdate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFind(none);
    try {
      const r = await updateBaggageStatus(bag.baggage_id, { status: upd.status, location: upd.location.trim() });
      const ok = await loadBag(bag.baggage_id);
      if (ok) setFind({ ok: r.message, err: "" });
      setUpd((u) => ({ ...u, location: "" }));
    } catch (err) {
      setFind({ ok: "", err: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">AIRPORT OPERATIONS</span>
          <h1>Baggage Management</h1>
          <p>Register baggage, track where it is and update its status.</p>
        </div>
      </div>

      <section className="admin-card">
        <h2>Register baggage</h2>
        <p className="ops-hint">The passenger must already be checked in.</p>
        <AdminNotice success={reg.ok} error={reg.err} />
        <form onSubmit={submitRegister}>
          <div className="admin-form-grid">
            <label>
              Seat reservation ID
              <input inputMode="numeric" value={form.reservationId} onChange={(e) => setForm({ ...form, reservationId: e.target.value.replace(/\D/g, "") })} />
            </label>
            <label>
              Flight schedule ID
              <input inputMode="numeric" value={form.scheduleId} onChange={(e) => setForm({ ...form, scheduleId: e.target.value.replace(/\D/g, "") })} />
            </label>
            <label>
              Tag number
              <input value={form.tagNumber} maxLength={20} onChange={set("tagNumber")} />
            </label>
            <label>
              Weight (kg)
              <input type="number" min="0.1" max="999.99" step="0.1" value={form.weightKg} onChange={set("weightKg")} />
            </label>
            <label>
              Baggage type
              <select value={form.baggageType} onChange={set("baggageType")}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <div className="admin-actions">
            <button className="admin-primary" disabled={!formOk || busy}>{busy ? "Saving…" : "Register baggage"}</button>
            <button type="button" className="admin-secondary" onClick={() => setForm({ ...form, tagNumber: randomTag() })}>
              Generate tag
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <h2>Find &amp; track baggage</h2>
        <AdminNotice success={find.ok} error={find.err} />
        <form onSubmit={submitFind}>
          <div className="admin-form-grid">
            <label>
              Baggage ID
              <input inputMode="numeric" value={lookupId} onChange={(e) => setLookupId(e.target.value.replace(/\D/g, ""))} />
            </label>
          </div>
          <div className="admin-actions">
            <button className="admin-secondary" disabled={!isId(lookupId)}>Find baggage</button>
          </div>
        </form>

        {bag && (
          <>
            <h2 style={{ marginTop: 28 }}>
              Tag {bag.tag_number} <span className={`ops-badge ${tone(bag.baggage_status)}`}>{bag.baggage_status}</span>
            </h2>
            <dl className="ops-dl">
              <div><dt>Passenger</dt><dd>{bag.full_name}</dd></div>
              <div><dt>Ticket</dt><dd>{bag.ticket_number}</dd></div>
              <div><dt>Type</dt><dd>{bag.baggage_type}</dd></div>
              <div><dt>Weight</dt><dd>{Number(bag.weight_kg)} kg</dd></div>
              <div><dt>Screening</dt><dd>{bag.screening_status}</dd></div>
              <div><dt>Current location</dt><dd>{bag.current_location || "—"}</dd></div>
              <div><dt>Flight schedule</dt><dd>#{bag.schedule_id}</dd></div>
            </dl>

            <form onSubmit={submitUpdate}>
              <div className="admin-form-grid">
                <label>
                  New status
                  <select value={upd.status} onChange={(e) => setUpd({ ...upd, status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label>
                  Location
                  <input value={upd.location} onChange={(e) => setUpd({ ...upd, location: e.target.value })} placeholder="e.g. Belt 4, Terminal 1" />
                </label>
              </div>
              <div className="admin-actions">
                <button className="admin-primary" disabled={!upd.location.trim() || busy}>Update status</button>
              </div>
            </form>

            <h2 style={{ marginTop: 28 }}>Tracking history</h2>
            {history.length === 0 ? (
              <p className="ops-empty">No tracking history yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Time</th><th>Location</th><th>Status</th></tr></thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i}>
                        <td>{fmtDateTime(h.recorded_at)}</td>
                        <td>{h.location}</td>
                        <td><span className={`ops-badge ${tone(h.status)}`}>{h.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
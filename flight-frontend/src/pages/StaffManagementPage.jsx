import { useCallback, useEffect, useMemo, useState } from "react";
import "../admin.css";
import "../admin-ops.css";
import AdminNotice from "../components/AdminNotice";
import { assignStaff, getAirportList, getAllStaff, getStaffAssignments, updateAssignmentStatus } from "../adminOpsApi";
import { fmtDateTime, isId, toSqlDateTime } from "../adminUtils";

const none = { ok: "", err: "" };
const blank = { staffId: "", scheduleId: "", dutyLocation: "", shiftStart: "", shiftEnd: "" };

// same transitions as your backend allows
const NEXT = {
  Assigned: [["In Progress", "Start"], ["Cancelled", "Cancel"]],
  "In Progress": [["Completed", "Complete"], ["Cancelled", "Cancel"]],
};

const availTone = { Available: "ok", Busy: "warn", "On Leave": "muted", Inactive: "muted" };
const statusTone = { Assigned: "", "In Progress": "warn", Completed: "ok", Cancelled: "bad" };

export default function StaffManagementPage() {
  const [staff, setStaff] = useState([]);
  const [airports, setAirports] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [listMsg, setListMsg] = useState(none);

  const [form, setForm] = useState(blank);
  const [assignMsg, setAssignMsg] = useState(none);
  const [busy, setBusy] = useState(false);

  const [selected, setSelected] = useState(null); // staff row
  const [assignments, setAssignments] = useState([]);
  const [rowMsg, setRowMsg] = useState(none);

  const loadStaff = useCallback(async () => {
    try {
      setStaff(await getAllStaff());
      setListMsg(none);
    } catch (e) {
      setListMsg({ ok: "", err: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAssignments = useCallback(async (s) => {
    try {
      setAssignments(await getStaffAssignments(s.staff_id));
    } catch (e) {
      setAssignments([]);
      setRowMsg({ ok: "", err: e.message });
    }
  }, []);

  useEffect(() => {
    loadStaff();
    getAirportList().then(setAirports).catch(() => {});
  }, [loadStaff]);

  const airportCode = useMemo(() => Object.fromEntries(airports.map((a) => [a.airport_id, a.airport_code])), [airports]);
  const shown = filter ? staff.filter((s) => String(s.airport_id) === filter) : staff;
  const activeStaff = staff.filter((s) => s.staff_status === "Active");

  const open = (s) => {
    setSelected(s);
    setRowMsg(none);
    loadAssignments(s);
  };

  const formOk =
    isId(form.staffId) && form.dutyLocation.trim() && form.shiftStart && form.shiftEnd && form.shiftEnd > form.shiftStart;

  const submitAssign = async (e) => {
    e.preventDefault();
    setBusy(true);
    setAssignMsg(none);
    try {
      const r = await assignStaff({
        staffId: Number(form.staffId),
        scheduleId: form.scheduleId ? Number(form.scheduleId) : null,
        dutyLocation: form.dutyLocation.trim(),
        shiftStart: toSqlDateTime(form.shiftStart),
        shiftEnd: toSqlDateTime(form.shiftEnd),
      });
      setAssignMsg({ ok: `${r.message} (assignment #${r.assignmentId}).`, err: "" });
      const s = staff.find((x) => x.staff_id === Number(form.staffId));
      setForm(blank);
      await loadStaff();
      if (s) open(s);
    } catch (err) {
      setAssignMsg({ ok: "", err: err.message });
    } finally {
      setBusy(false);
    }
  };

  const change = async (a, status) => {
    setBusy(true);
    setRowMsg(none);
    try {
      const r = await updateAssignmentStatus(a.staff_assignment_id, status);
      await Promise.all([loadAssignments(selected), loadStaff()]);
      setRowMsg({ ok: r.message, err: "" });
    } catch (err) {
      setRowMsg({ ok: "", err: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">AIRPORT OPERATIONS</span>
          <h1>Staff Management</h1>
          <p>See who is available, assign staff to shifts and update assignment status.</p>
        </div>
        <div className="admin-count">
          <strong>{staff.filter((s) => s.availability === "Available").length}</strong>
          <span>available now</span>
        </div>
      </div>

      <section className="admin-card">
        <div className="admin-table-heading">
          <h2>All staff</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by airport" style={{ height: 42, borderRadius: 10, border: "1px solid var(--line)", padding: "0 12px", font: "inherit" }}>
            <option value="">All airports</option>
            {airports.map((a) => <option key={a.airport_id} value={a.airport_id}>{a.city} ({a.airport_code})</option>)}
          </select>
        </div>
        <AdminNotice error={listMsg.err} />
        {loading ? (
          <p className="ops-empty">Loading staff…</p>
        ) : shown.length === 0 ? (
          <p className="ops-empty">No staff found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>ID</th><th>Name</th><th>Role</th><th>Airport</th><th>Status</th><th>Availability</th><th /></tr>
              </thead>
              <tbody>
                {shown.map((s) => (
                  <tr key={s.staff_id}>
                    <td>{s.staff_id}</td>
                    <td>{s.full_name}</td>
                    <td>{s.job_role}</td>
                    <td>{airportCode[s.airport_id] ?? s.airport_id}</td>
                    <td>{s.staff_status}</td>
                    <td><span className={`ops-badge ${availTone[s.availability] ?? ""}`}>{s.availability}</span></td>
                    <td><button className="admin-edit admin-small" onClick={() => open(s)}>Assignments</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card">
        <h2>Assign staff to a shift</h2>
        <AdminNotice success={assignMsg.ok} error={assignMsg.err} />
        <form onSubmit={submitAssign}>
          <div className="admin-form-grid">
            <label>
              Staff member
              <select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
                <option value="">Select staff</option>
                {activeStaff.map((s) => (
                  <option key={s.staff_id} value={s.staff_id}>{s.full_name} · {s.job_role} ({s.availability})</option>
                ))}
              </select>
            </label>
            <label>
              Flight schedule ID (optional)
              <input inputMode="numeric" value={form.scheduleId} onChange={(e) => setForm({ ...form, scheduleId: e.target.value.replace(/\D/g, "") })} />
            </label>
            <label className="admin-full-width">
              Duty location
              <input value={form.dutyLocation} onChange={(e) => setForm({ ...form, dutyLocation: e.target.value })} placeholder="e.g. Gate 12, Terminal 1" />
            </label>
            <label>
              Shift start
              <input type="datetime-local" value={form.shiftStart} onChange={(e) => setForm({ ...form, shiftStart: e.target.value })} />
            </label>
            <label>
              Shift end
              <input type="datetime-local" value={form.shiftEnd} min={form.shiftStart} onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })} />
            </label>
          </div>
          <div className="admin-actions">
            <button className="admin-primary" disabled={!formOk || busy}>{busy ? "Saving…" : "Assign"}</button>
          </div>
        </form>
      </section>

      {selected && (
        <section className="admin-card">
          <h2>Assignments for {selected.full_name}</h2>
          <AdminNotice success={rowMsg.ok} error={rowMsg.err} />
          {assignments.length === 0 ? (
            <p className="ops-empty">No assignments yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>ID</th><th>Location</th><th>Flight</th><th>Shift</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.staff_assignment_id}>
                      <td>{a.staff_assignment_id}</td>
                      <td>{a.duty_location}</td>
                      <td>{a.schedule_id ? `#${a.schedule_id}` : "—"}</td>
                      <td>{fmtDateTime(a.shift_start)} → {fmtDateTime(a.shift_end)}</td>
                      <td><span className={`ops-badge ${statusTone[a.assignment_status] ?? ""}`}>{a.assignment_status}</span></td>
                      <td>
                        <div className="admin-row-actions">
                          {(NEXT[a.assignment_status] ?? []).map(([to, label]) => (
                            <button
                              key={to}
                              className={to === "Cancelled" ? "admin-delete admin-small" : "admin-edit admin-small"}
                              disabled={busy}
                              onClick={() => change(a, to)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
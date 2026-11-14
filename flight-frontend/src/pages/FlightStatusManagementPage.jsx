
import { useEffect, useState } from "react";
import {
  getFlightSchedules,
  updateFlightStatus,
} from "../flightManagementApi";
import "../admin.css";

const statuses = [
  "Scheduled",
  "Boarding",
  "Departed",
  "Arrived",
  "Delayed",
  "Cancelled",
];

export default function FlightStatusManagementPage() {
  const [schedules, setSchedules] = useState([]);
  const [scheduleId, setScheduleId] = useState("");
  const [newStatus, setNewStatus] = useState("Scheduled");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadSchedules() {
    try {
      setLoading(true);
      const response = await getFlightSchedules();
      setSchedules(response.data);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not load flight schedules."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedules();
  }, []);

  const selectedSchedule = schedules.find(
    (item) => String(item.schedule_id) === scheduleId
  );

  function statusClass(status) {
    if (status === "Arrived") return "ok";
    if (status === "Delayed" || status === "Boarding") return "warn";
    if (status === "Cancelled") return "bad";
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!scheduleId) {
      setError("Please select a flight schedule.");
      return;
    }

    if (selectedSchedule?.flight_status === newStatus) {
      setError("The selected flight already has this status.");
      return;
    }

    setSaving(true);

    try {
      const response = await updateFlightStatus(scheduleId, {
        new_status: newStatus,
        reason: reason.trim() || null,
      });

      setMessage(
        `Status changed from ${response.data.old_status} to ${response.data.new_status} successfully!`
      );

      setReason("");
      await loadSchedules();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not update flight status."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <p className="admin-eyebrow">AIRPORT OPERATIONS</p>
          <h1>Flight Status Management</h1>
          <p>Update flight status and record the reason for changes.</p>
        </div>

        <div className="admin-count">
          <strong>{schedules.length}</strong>
          <span>Total schedules</span>
        </div>
      </div>

      {message && <div className="admin-success">{message}</div>}
      {error && <div className="admin-error">{error}</div>}

      <section className="admin-card">
        <h2>Update Flight Status</h2>

        {loading ? (
          <p>Loading flight schedules...</p>
        ) : schedules.length === 0 ? (
          <p>No flight schedules available. Create a schedule first.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <label>
                Select Flight Schedule
                <select
                  value={scheduleId}
                  onChange={(e) => setScheduleId(e.target.value)}
                  required
                >
                  <option value="">Choose a schedule</option>
                  {schedules.map((item) => (
                    <option
                      key={item.schedule_id}
                      value={item.schedule_id}
                    >
                      Schedule {item.schedule_id} — Flight {item.flight_id}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                New Flight Status
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  required
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-full-width">
                Reason for Status Change
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Flight delayed due to weather conditions"
                  rows="3"
                />
              </label>
            </div>

            {selectedSchedule && (
              <div className="admin-status-preview">
                <span>Current status</span>
                <span className={`badge ${statusClass(selectedSchedule.flight_status)}`}>
                  {selectedSchedule.flight_status}
                </span>
                <span className="admin-status-arrow">→</span>
                <span>New status</span>
                <span className={`badge ${statusClass(newStatus)}`}>
                  {newStatus}
                </span>
              </div>
            )}

            <div className="admin-actions">
              <button
                className="admin-primary"
                disabled={saving || !scheduleId}
              >
                {saving ? "Updating..." : "Update Flight Status"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-table-heading">
          <h2>Current Flight Statuses</h2>
          <button
            className="admin-secondary"
            onClick={loadSchedules}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : schedules.length === 0 ? (
          <p>No schedules found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Schedule ID</th>
                  <th>Flight ID</th>
                  <th>Aircraft ID</th>
                  <th>Source Airport</th>
                  <th>Destination Airport</th>
                  <th>Current Status</th>
                </tr>
              </thead>

              <tbody>
                {schedules.map((item) => (
                  <tr key={item.schedule_id}>
                    <td>{item.schedule_id}</td>
                    <td>{item.flight_id}</td>
                    <td>{item.aircraft_id}</td>
                    <td>{item.source_airport_id}</td>
                    <td>{item.destination_airport_id}</td>
                    <td>
                      <span className={`badge ${statusClass(item.flight_status)}`}>
                        {item.flight_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

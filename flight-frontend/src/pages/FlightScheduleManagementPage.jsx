
import { useEffect, useState } from "react";
import {
  getFlightSchedules,
  createFlightSchedule,
  updateFlightSchedule,
  deleteFlightSchedule,
  getFlights,
  getAircraft,
  getManagedAirports,
  getGates,
} from "../flightManagementApi";
import "../admin.css";

const emptyForm = {
  flight_id: "",
  aircraft_id: "",
  source_airport_id: "",
  destination_airport_id: "",
  departure_time: "",
  arrival_time: "",
  flight_status: "Scheduled",
  gate_id: "",
};

const statuses = [
  "Scheduled",
  "Boarding",
  "Departed",
  "Arrived",
  "Delayed",
  "Cancelled",
];

// Convert MySQL datetime into a value suitable for datetime-local.
function toDateTimeLocal(value) {
  if (!value) return "";
  return String(value).replace(" ", "T").slice(0, 16);
}

// Convert datetime-local into MySQL DATETIME format.
function toMySQLDateTime(value) {
  return value ? value.replace("T", " ") + ":00" : "";
}

export default function FlightScheduleManagementPage() {
  const [schedules, setSchedules] = useState([]);
  const [flights, setFlights] = useState([]);
  const [aircraft, setAircraft] = useState([]);
  const [airports, setAirports] = useState([]);
  const [gates, setGates] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);

      const [
        scheduleRes,
        flightRes,
        aircraftRes,
        airportRes,
        gateRes,
      ] = await Promise.all([
        getFlightSchedules(),
        getFlights(),
        getAircraft(),
        getManagedAirports(),
        getGates(),
      ]);

      setSchedules(scheduleRes.data);
      setFlights(flightRes.data);
      setAircraft(aircraftRes.data);
      setAirports(airportRes.data);
      setGates(gateRes.data);

      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not load schedule data. Check your backend."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function startEdit(schedule) {
    setEditingId(schedule.schedule_id);

    setForm({
      flight_id: String(schedule.flight_id),
      aircraft_id: String(schedule.aircraft_id),
      source_airport_id: String(schedule.source_airport_id),
      destination_airport_id: String(schedule.destination_airport_id),
      departure_time: toDateTimeLocal(schedule.departure_time),
      arrival_time: toDateTimeLocal(schedule.arrival_time),
      flight_status: schedule.flight_status,
      gate_id: schedule.gate_id ? String(schedule.gate_id) : "",
    });

    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (form.source_airport_id === form.destination_airport_id) {
      setError("Departure and arrival airports must be different.");
      return;
    }

    if (new Date(form.arrival_time) <= new Date(form.departure_time)) {
      setError("Arrival time must be later than departure time.");
      return;
    }

    setSaving(true);

    const data = {
      flight_id: Number(form.flight_id),
      aircraft_id: Number(form.aircraft_id),
      source_airport_id: Number(form.source_airport_id),
      destination_airport_id: Number(form.destination_airport_id),
      departure_time: toMySQLDateTime(form.departure_time),
      arrival_time: toMySQLDateTime(form.arrival_time),
      flight_status: form.flight_status,
      gate_id: form.gate_id ? Number(form.gate_id) : null,
    };

    try {
      if (editingId) {
        await updateFlightSchedule(editingId, data);
        setMessage("Flight schedule updated successfully!");
      } else {
        await createFlightSchedule(data);
        setMessage("Flight schedule created successfully!");
      }

      resetForm();
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not save schedule. Check the selected IDs and dates."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this flight schedule?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await deleteFlightSchedule(id);
      setMessage("Flight schedule deleted successfully!");
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not delete this schedule. It may have dependent records."
      );
    }
  }

  function airportName(id) {
    const airport = airports.find(
      (item) => item.airport_id === id
    );
    return airport
      ? `${airport.airport_code} - ${airport.city}`
      : `Airport ${id}`;
  }

  function statusClass(status) {
    if (status === "Arrived") return "ok";
    if (status === "Delayed" || status === "Boarding") return "warn";
    if (status === "Cancelled") return "bad";
    return "";
  }

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <p className="admin-eyebrow">AIRPORT OPERATIONS</p>
          <h1>Flight Schedule Management</h1>
          <p>Manage routes, timings, aircraft and gate assignments.</p>
        </div>

        <div className="admin-count">
          <strong>{schedules.length}</strong>
          <span>Total schedules</span>
        </div>
      </div>

      {message && <div className="admin-success">{message}</div>}
      {error && <div className="admin-error">{error}</div>}

      <section className="admin-card">
        <h2>{editingId ? "Edit Schedule" : "Create New Schedule"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <label>
              Flight
              <select name="flight_id" value={form.flight_id}
                onChange={handleChange} required>
                <option value="">Select flight</option>
                {flights.map((item) => (
                  <option key={item.flight_id} value={item.flight_id}>
                    {item.flight_number} (ID: {item.flight_id})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Aircraft
              <select name="aircraft_id" value={form.aircraft_id}
                onChange={handleChange} required>
                <option value="">Select aircraft</option>
                {aircraft.map((item) => (
                  <option key={item.aircraft_id} value={item.aircraft_id}>
                    {item.registration_number} - {item.model}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Source Airport
              <select name="source_airport_id"
                value={form.source_airport_id}
                onChange={handleChange} required>
                <option value="">Select departure airport</option>
                {airports.map((item) => (
                  <option key={item.airport_id} value={item.airport_id}>
                    {item.airport_code} - {item.city}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Destination Airport
              <select name="destination_airport_id"
                value={form.destination_airport_id}
                onChange={handleChange} required>
                <option value="">Select arrival airport</option>
                {airports.map((item) => (
                  <option key={item.airport_id} value={item.airport_id}>
                    {item.airport_code} - {item.city}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Departure Date & Time
              <input type="datetime-local"
                name="departure_time"
                value={form.departure_time}
                onChange={handleChange}
                required />
            </label>

            <label>
              Arrival Date & Time
              <input type="datetime-local"
                name="arrival_time"
                value={form.arrival_time}
                onChange={handleChange}
                required />
            </label>

            <label>
              Flight Status
              <select name="flight_status"
                value={form.flight_status}
                onChange={handleChange} required>
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>

            <label>
              Gate (Optional)
              <select name="gate_id" value={form.gate_id}
                onChange={handleChange}>
                <option value="">No gate assigned</option>
                {gates.map((item) => (
                  <option key={item.gate_id} value={item.gate_id}>
                    Gate {item.gate_number} (ID: {item.gate_id})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="admin-actions">
            <button className="admin-primary" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                ? "Update Schedule"
                : "Create Schedule"}
            </button>

            {editingId && (
              <button type="button" className="admin-secondary"
                onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-table-heading">
          <h2>All Flight Schedules</h2>
          <button className="admin-secondary"
            onClick={loadData} disabled={loading}>
            Refresh
          </button>
        </div>

        {loading ? (
          <p>Loading schedules...</p>
        ) : schedules.length === 0 ? (
          <p>No schedules found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Flight</th>
                  <th>Route</th>
                  <th>Departure</th>
                  <th>Arrival</th>
                  <th>Aircraft ID</th>
                  <th>Gate ID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {schedules.map((item) => (
                  <tr key={item.schedule_id}>
                    <td>{item.schedule_id}</td>
                    <td>
                      {flights.find(
                        (f) => f.flight_id === item.flight_id
                      )?.flight_number || `Flight ${item.flight_id}`}
                    </td>
                    <td>
                      {airportName(item.source_airport_id)}
                      {" → "}
                      {airportName(item.destination_airport_id)}
                    </td>
                    <td>{String(item.departure_time).replace("T", " ").slice(0, 16)}</td>
                    <td>{String(item.arrival_time).replace("T", " ").slice(0, 16)}</td>
                    <td>{item.aircraft_id}</td>
                    <td>{item.gate_id ?? "—"}</td>
                    <td>
                      <span className={`badge ${statusClass(item.flight_status)}`}>
                        {item.flight_status}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="admin-edit"
                          onClick={() => startEdit(item)}>
                          Edit
                        </button>
                        <button className="admin-delete"
                          onClick={() => handleDelete(item.schedule_id)}>
                          Delete
                        </button>
                      </div>
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

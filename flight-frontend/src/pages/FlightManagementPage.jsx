
import { useEffect, useState } from "react";
import {
  getFlights,
  createFlight,
  updateFlight,
  deleteFlight,
} from "../flightManagementApi";
import "../admin.css";

const emptyForm = {
  flight_number: "",
  airline_id: "",
};

export default function FlightManagementPage() {
  const [flights, setFlights] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadFlights() {
    try {
      setLoading(true);
      const response = await getFlights();
      setFlights(response.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load flights.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFlights();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function startEdit(flight) {
    setEditingId(flight.flight_id);
    setForm({
      flight_number: flight.flight_number,
      airline_id: String(flight.airline_id),
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
    setSaving(true);
    setError("");
    setMessage("");

    const data = {
      flight_number: form.flight_number.trim(),
      airline_id: Number(form.airline_id),
    };

    try {
      if (editingId) {
        await updateFlight(editingId, data);
        setMessage("Flight updated successfully!");
      } else {
        await createFlight(data);
        setMessage("Flight added successfully!");
      }

      resetForm();
      await loadFlights();
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this flight?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await deleteFlight(id);
      setMessage("Flight deleted successfully!");
      await loadFlights();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not delete flight. It may be linked to flight schedules."
      );
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <p className="admin-eyebrow">AIRPORT OPERATIONS</p>
          <h1>Flight Management</h1>
          <p>Manage flight numbers and airline assignments.</p>
        </div>

        <div className="admin-count">
          <strong>{flights.length}</strong>
          <span>Total flights</span>
        </div>
      </div>

      {message && <div className="admin-success">{message}</div>}
      {error && <div className="admin-error">{error}</div>}

      <section className="admin-card">
        <h2>{editingId ? "Edit Flight" : "Add New Flight"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <label>
              Flight Number
              <input
                name="flight_number"
                value={form.flight_number}
                onChange={handleChange}
                placeholder="e.g. AB101"
                required
              />
            </label>

            <label>
              Airline ID
              <input
                type="number"
                name="airline_id"
                value={form.airline_id}
                onChange={handleChange}
                placeholder="e.g. 1"
                min="1"
                required
              />
            </label>
          </div>

          <div className="admin-actions">
            <button className="admin-primary" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                ? "Update Flight"
                : "Add Flight"}
            </button>

            {editingId && (
              <button
                type="button"
                className="admin-secondary"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-table-heading">
          <h2>All Flights</h2>
          <button
            className="admin-secondary"
            onClick={loadFlights}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p>Loading flights...</p>
        ) : flights.length === 0 ? (
          <p>No flights found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Flight Number</th>
                  <th>Airline ID</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {flights.map((flight) => (
                  <tr key={flight.flight_id}>
                    <td>{flight.flight_id}</td>
                    <td><strong>{flight.flight_number}</strong></td>
                    <td>{flight.airline_id}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          className="admin-edit"
                          onClick={() => startEdit(flight)}
                        >
                          Edit
                        </button>

                        <button
                          className="admin-delete"
                          onClick={() => handleDelete(flight.flight_id)}
                        >
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

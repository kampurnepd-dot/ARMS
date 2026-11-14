
import { useEffect, useState } from "react";
import {
  getManagedAirports,
  createAirport,
  updateAirport,
  deleteAirport,
} from "../flightManagementApi";
import "../admin.css";

const emptyForm = {
  airport_code: "",
  name: "",
  city: "",
  country: "",
};

export default function AirportManagement() {
  const [airports, setAirports] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadAirports() {
    try {
      setLoading(true);
      const response = await getManagedAirports();
      setAirports(response.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load airports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAirports();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function startEdit(airport) {
    setEditingId(airport.airport_id);
    setForm({
      airport_code: airport.airport_code,
      name: airport.name,
      city: airport.city,
      country: airport.country,
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

    try {
      if (editingId) {
        await updateAirport(editingId, form);
        setMessage("Airport updated successfully!");
      } else {
        await createAirport(form);
        setMessage("Airport added successfully!");
      }

      resetForm();
      await loadAirports();
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this airport?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await deleteAirport(id);
      setMessage("Airport deleted successfully!");
      await loadAirports();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not delete airport. It may be linked to other records."
      );
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <p className="admin-eyebrow">AIRPORT OPERATIONS</p>
          <h1>Airport Management</h1>
          <p>Manage airports in your airline network.</p>
        </div>

        <div className="admin-count">
          <strong>{airports.length}</strong>
          <span>Total airports</span>
        </div>
      </div>

      {message && <div className="admin-success">{message}</div>}
      {error && <div className="admin-error">{error}</div>}

      <section className="admin-card">
        <h2>{editingId ? "Edit Airport" : "Add New Airport"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <label>
              Airport Code
              <input
                name="airport_code"
                value={form.airport_code}
                onChange={handleChange}
                placeholder="e.g. DEL"
                maxLength={10}
                required
              />
            </label>

            <label>
              Airport Name
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter airport name"
                required
              />
            </label>

            <label>
              City
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="Enter city"
                required
              />
            </label>

            <label>
              Country
              <input
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="Enter country"
                required
              />
            </label>
          </div>

          <div className="admin-actions">
            <button className="admin-primary" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                ? "Update Airport"
                : "Add Airport"}
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
          <h2>All Airports</h2>
          <button
            className="admin-secondary"
            onClick={loadAirports}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p>Loading airports...</p>
        ) : airports.length === 0 ? (
          <p>No airports found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Code</th>
                  <th>Airport Name</th>
                  <th>City</th>
                  <th>Country</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {airports.map((airport) => (
                  <tr key={airport.airport_id}>
                    <td>{airport.airport_id}</td>
                    <td><strong>{airport.airport_code}</strong></td>
                    <td>{airport.name}</td>
                    <td>{airport.city}</td>
                    <td>{airport.country}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          className="admin-edit"
                          onClick={() => startEdit(airport)}
                        >
                          Edit
                        </button>
                        <button
                          className="admin-delete"
                          onClick={() => handleDelete(airport.airport_id)}
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

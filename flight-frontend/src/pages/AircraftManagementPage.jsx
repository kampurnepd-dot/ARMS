
import { useEffect, useState } from "react";
import {
  getAircraft,
  createAircraft,
  updateAircraft,
  deleteAircraft,
} from "../flightManagementApi";
import "../admin.css";

const emptyForm = {
  registration_number: "",
  model: "",
  capacity: "",
  aircraft_status: "Active",
};

export default function AircraftManagementPage() {
  const [aircraft, setAircraft] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadAircraft() {
    try {
      setLoading(true);
      const response = await getAircraft();
      setAircraft(response.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load aircraft.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAircraft();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function startEdit(item) {
    setEditingId(item.aircraft_id);
    setForm({
      registration_number: item.registration_number,
      model: item.model,
      capacity: String(item.capacity),
      aircraft_status: item.aircraft_status,
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
      ...form,
      capacity: Number(form.capacity),
    };

    try {
      if (editingId) {
        await updateAircraft(editingId, data);
        setMessage("Aircraft updated successfully!");
      } else {
        await createAircraft(data);
        setMessage("Aircraft added successfully!");
      }

      resetForm();
      await loadAircraft();
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this aircraft?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await deleteAircraft(id);
      setMessage("Aircraft deleted successfully!");
      await loadAircraft();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not delete aircraft. It may be linked to flight schedules."
      );
    }
  }

  function statusClass(status) {
    if (status === "Active") return "ok";
    if (status === "Maintenance") return "warn";
    return "bad";
  }

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <p className="admin-eyebrow">AIRPORT OPERATIONS</p>
          <h1>Aircraft Management</h1>
          <p>Manage your airline's aircraft fleet.</p>
        </div>

        <div className="admin-count">
          <strong>{aircraft.length}</strong>
          <span>Total aircraft</span>
        </div>
      </div>

      {message && <div className="admin-success">{message}</div>}
      {error && <div className="admin-error">{error}</div>}

      <section className="admin-card">
        <h2>{editingId ? "Edit Aircraft" : "Add New Aircraft"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <label>
              Registration Number
              <input
                name="registration_number"
                value={form.registration_number}
                onChange={handleChange}
                placeholder="e.g. VT-ABA"
                required
              />
            </label>

            <label>
              Aircraft Model
              <input
                name="model"
                value={form.model}
                onChange={handleChange}
                placeholder="e.g. A320"
                required
              />
            </label>

            <label>
              Passenger Capacity
              <input
                type="number"
                name="capacity"
                value={form.capacity}
                onChange={handleChange}
                placeholder="e.g. 180"
                min="1"
                required
              />
            </label>

            <label>
              Aircraft Status
              <select
                name="aircraft_status"
                value={form.aircraft_status}
                onChange={handleChange}
                required
              >
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Retired">Retired</option>
              </select>
            </label>
          </div>

          <div className="admin-actions">
            <button className="admin-primary" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                ? "Update Aircraft"
                : "Add Aircraft"}
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
          <h2>All Aircraft</h2>
          <button
            className="admin-secondary"
            onClick={loadAircraft}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p>Loading aircraft...</p>
        ) : aircraft.length === 0 ? (
          <p>No aircraft found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Registration</th>
                  <th>Model</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {aircraft.map((item) => (
                  <tr key={item.aircraft_id}>
                    <td>{item.aircraft_id}</td>
                    <td><strong>{item.registration_number}</strong></td>
                    <td>{item.model}</td>
                    <td>{item.capacity}</td>
                    <td>
                      <span className={`badge ${statusClass(item.aircraft_status)}`}>
                        {item.aircraft_status}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          className="admin-edit"
                          onClick={() => startEdit(item)}
                        >
                          Edit
                        </button>

                        <button
                          className="admin-delete"
                          onClick={() => handleDelete(item.aircraft_id)}
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

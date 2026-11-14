
import { useEffect, useState } from "react";
import {
  getGates,
  createGate,
  updateGate,
  deleteGate,
} from "../flightManagementApi";
import "../admin.css";

const emptyForm = {
  terminal_id: "",
  gate_number: "",
  gate_status: "Available",
};

export default function GateManagementPage() {
  const [gates, setGates] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadGates() {
    try {
      setLoading(true);
      const response = await getGates();
      setGates(response.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load gates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGates();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function startEdit(gate) {
    setEditingId(gate.gate_id);
    setForm({
      terminal_id: String(gate.terminal_id),
      gate_number: gate.gate_number,
      gate_status: gate.gate_status,
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
      terminal_id: Number(form.terminal_id),
    };

    try {
      if (editingId) {
        await updateGate(editingId, data);
        setMessage("Gate updated successfully!");
      } else {
        await createGate(data);
        setMessage("Gate added successfully!");
      }

      resetForm();
      await loadGates();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Operation failed. Check the terminal ID and gate number."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this gate?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await deleteGate(id);
      setMessage("Gate deleted successfully!");
      await loadGates();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not delete gate. It may be assigned to a flight."
      );
    }
  }

  function statusClass(status) {
    if (status === "Available") return "ok";
    if (status === "Occupied") return "warn";
    if (status === "Maintenance" || status === "Closed") return "bad";
    return "";
  }

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <p className="admin-eyebrow">AIRPORT OPERATIONS</p>
          <h1>Gate Management</h1>
          <p>Manage airport gates and their availability.</p>
        </div>

        <div className="admin-count">
          <strong>{gates.length}</strong>
          <span>Total gates</span>
        </div>
      </div>

      {message && <div className="admin-success">{message}</div>}
      {error && <div className="admin-error">{error}</div>}

      <section className="admin-card">
        <h2>{editingId ? "Edit Gate" : "Add New Gate"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <label>
              Terminal ID
              <input
                type="number"
                name="terminal_id"
                value={form.terminal_id}
                onChange={handleChange}
                placeholder="e.g. 1"
                min="1"
                required
              />
            </label>

            <label>
              Gate Number
              <input
                name="gate_number"
                value={form.gate_number}
                onChange={handleChange}
                placeholder="e.g. A1"
                required
              />
            </label>

            <label>
              Gate Status
              <select
                name="gate_status"
                value={form.gate_status}
                onChange={handleChange}
                required
              >
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Closed">Closed</option>
              </select>
            </label>
          </div>

          <div className="admin-actions">
            <button className="admin-primary" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                ? "Update Gate"
                : "Add Gate"}
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
          <h2>All Gates</h2>
          <button
            className="admin-secondary"
            onClick={loadGates}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p>Loading gates...</p>
        ) : gates.length === 0 ? (
          <p>No gates found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Terminal ID</th>
                  <th>Gate Number</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {gates.map((gate) => (
                  <tr key={gate.gate_id}>
                    <td>{gate.gate_id}</td>
                    <td>{gate.terminal_id}</td>
                    <td><strong>{gate.gate_number}</strong></td>
                    <td>
                      <span className={`badge ${statusClass(gate.gate_status)}`}>
                        {gate.gate_status}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          className="admin-edit"
                          onClick={() => startEdit(gate)}
                        >
                          Edit
                        </button>

                        <button
                          className="admin-delete"
                          onClick={() => handleDelete(gate.gate_id)}
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

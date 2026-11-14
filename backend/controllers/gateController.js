
const pool = require("../config/pool");

// READ: Get all gates
async function getGates(req, res) {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM Gate"
        );

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch gates"
        });
    }
}

// CREATE: Add a new gate
async function createGate(req, res) {
    try {
        const { terminal_id, gate_number, gate_status } = req.body;

        const [result] = await pool.query(
            `INSERT INTO Gate
            (terminal_id, gate_number, gate_status)
            VALUES (?, ?, ?)`,
            [terminal_id, gate_number, gate_status || "Available"]
        );

        res.status(201).json({
            message: "Gate added successfully",
            gate_id: result.insertId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to add gate"
        });
    }
}

// UPDATE: Change gate details
async function updateGate(req, res) {
    try {
        const { id } = req.params;
        const { terminal_id, gate_number, gate_status } = req.body;

        const [result] = await pool.query(
            `UPDATE Gate
             SET terminal_id = ?, gate_number = ?, gate_status = ?
             WHERE gate_id = ?`,
            [terminal_id, gate_number, gate_status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Gate not found"
            });
        }

        res.json({
            message: "Gate updated successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to update gate"
        });
    }
}

// DELETE: Remove a gate
async function deleteGate(req, res) {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            "DELETE FROM Gate WHERE gate_id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Gate not found"
            });
        }

        res.json({
            message: "Gate deleted successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to delete gate"
        });
    }
}

module.exports = {
    getGates,
    createGate,
    updateGate,
    deleteGate
};

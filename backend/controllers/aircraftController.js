
const pool = require("../config/pool");

// READ: Get all aircraft
async function getAircraft(req, res) {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM Aircraft"
        );

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch aircraft"
        });
    }
}

// CREATE: Add a new aircraft
async function createAircraft(req, res) {
    try {
        const {
            registration_number,
            model,
            capacity,
            aircraft_status
        } = req.body;

        const [result] = await pool.query(
            `INSERT INTO Aircraft
            (registration_number, model, capacity, aircraft_status)
            VALUES (?, ?, ?, ?)`,
            [
                registration_number,
                model,
                capacity,
                aircraft_status || "Active"
            ]
        );

        res.status(201).json({
            message: "Aircraft added successfully",
            aircraft_id: result.insertId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to add aircraft"
        });
    }
}

// UPDATE: Change aircraft details
async function updateAircraft(req, res) {
    try {
        const { id } = req.params;

        const {
            registration_number,
            model,
            capacity,
            aircraft_status
        } = req.body;

        const [result] = await pool.query(
            `UPDATE Aircraft
             SET registration_number = ?,
                 model = ?,
                 capacity = ?,
                 aircraft_status = ?
             WHERE aircraft_id = ?`,
            [
                registration_number,
                model,
                capacity,
                aircraft_status,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Aircraft not found"
            });
        }

        res.json({
            message: "Aircraft updated successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to update aircraft"
        });
    }
}

// DELETE: Remove an aircraft
async function deleteAircraft(req, res) {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            "DELETE FROM Aircraft WHERE aircraft_id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Aircraft not found"
            });
        }

        res.json({
            message: "Aircraft deleted successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to delete aircraft"
        });
    }
}

module.exports = {
    getAircraft,
    createAircraft,
    updateAircraft,
    deleteAircraft
};


const pool = require("../config/pool");

// READ: Get all flights
async function getFlights(req, res) {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM Flight"
        );

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch flights"
        });
    }
}

// CREATE: Add a new flight
async function createFlight(req, res) {
    try {
        const { flight_number, airline_id } = req.body;

        const [result] = await pool.query(
            `INSERT INTO Flight
            (flight_number, airline_id)
            VALUES (?, ?)`,
            [flight_number, airline_id]
        );

        res.status(201).json({
            message: "Flight added successfully",
            flight_id: result.insertId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to add flight"
        });
    }
}

// UPDATE: Change flight details
async function updateFlight(req, res) {
    try {
        const { id } = req.params;
        const { flight_number, airline_id } = req.body;

        const [result] = await pool.query(
            `UPDATE Flight
             SET flight_number = ?, airline_id = ?
             WHERE flight_id = ?`,
            [flight_number, airline_id, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Flight not found"
            });
        }

        res.json({
            message: "Flight updated successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to update flight"
        });
    }
}

// DELETE: Remove a flight
async function deleteFlight(req, res) {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            "DELETE FROM Flight WHERE flight_id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Flight not found"
            });
        }

        res.json({
            message: "Flight deleted successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to delete flight"
        });
    }
}

module.exports = {
    getFlights,
    createFlight,
    updateFlight,
    deleteFlight
};

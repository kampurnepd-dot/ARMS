const { invalidateFlightCache } = require("../utils/flightCache");
const pool = require("../config/pool");

// READ: Get all flight schedules
async function getSchedules(req, res) {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM Flight_Schedule"
        );

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch schedules"
        });
    }
}

// CREATE: Add a flight schedule
async function createSchedule(req, res) {
    try {
        const {
            flight_id,
            aircraft_id,
            source_airport_id,
            destination_airport_id,
            departure_time,
            arrival_time,
            flight_status,
            gate_id
        } = req.body;

        const [result] = await pool.query(
            `INSERT INTO Flight_Schedule
            (flight_id, aircraft_id, source_airport_id,
             destination_airport_id, departure_time,
             arrival_time, flight_status, gate_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                flight_id,
                aircraft_id,
                source_airport_id,
                destination_airport_id,
                departure_time,
                arrival_time,
                flight_status || "Scheduled",
                gate_id ?? null
            ]
        );
        await invalidateFlightCache();

        res.status(201).json({
            message: "Flight schedule created successfully",
            schedule_id: result.insertId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to create schedule"
        });
    }
}

// UPDATE: Change flight schedule
async function updateSchedule(req, res) {
    try {
        const { id } = req.params;

        const {
            flight_id,
            aircraft_id,
            source_airport_id,
            destination_airport_id,
            departure_time,
            arrival_time,
            flight_status,
            gate_id
        } = req.body;

        const [result] = await pool.query(
            `UPDATE Flight_Schedule
             SET flight_id = ?,
                 aircraft_id = ?,
                 source_airport_id = ?,
                 destination_airport_id = ?,
                 departure_time = ?,
                 arrival_time = ?,
                 flight_status = ?,
                 gate_id = ?
             WHERE schedule_id = ?`,
            [
                flight_id,
                aircraft_id,
                source_airport_id,
                destination_airport_id,
                departure_time,
                arrival_time,
                flight_status,
                gate_id ?? null,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Schedule not found"
            });
        }
        await invalidateFlightCache();

        res.json({
            message: "Flight schedule updated successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to update schedule"
        });
    }
}

// DELETE: Remove a flight schedule
async function deleteSchedule(req, res) {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            "DELETE FROM Flight_Schedule WHERE schedule_id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Schedule not found"
            });
        }
        await invalidateFlightCache();
        res.json({
            message: "Flight schedule deleted successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to delete schedule"
        });
    }
}

module.exports = {
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule
};

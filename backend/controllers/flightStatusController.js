
const pool = require("../config/pool");

// UPDATE: Change flight status and record history
async function updateFlightStatus(req, res) {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;
        const { new_status, reason } = req.body;

        const allowedStatuses = [
            "Scheduled",
            "Boarding",
            "Departed",
            "Arrived",
            "Delayed",
            "Cancelled"
        ];

        if (!allowedStatuses.includes(new_status)) {
            return res.status(400).json({
                message: "Invalid flight status"
            });
        }

        await connection.beginTransaction();

        // Get the current status
        const [rows] = await connection.query(
            `SELECT flight_status
             FROM Flight_Schedule
             WHERE schedule_id = ?
             FOR UPDATE`,
            [id]
        );

        if (rows.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Flight schedule not found"
            });
        }

        const old_status = rows[0].flight_status;

        // Update current status
        await connection.query(
            `UPDATE Flight_Schedule
             SET flight_status = ?
             WHERE schedule_id = ?`,
            [new_status, id]
        );

        // Record status change
        await connection.query(
            `INSERT INTO Flight_Status_History
             (schedule_id, old_status, new_status, reason)
             VALUES (?, ?, ?, ?)`,
            [id, old_status, new_status, reason || null]
        );

        await connection.commit();

        res.json({
            message: "Flight status updated successfully",
            old_status,
            new_status
        });

    } catch (error) {
        await connection.rollback();

        console.error(error);

        res.status(500).json({
            message: "Failed to update flight status"
        });

    } finally {
        connection.release();
    }
}

module.exports = { updateFlightStatus };

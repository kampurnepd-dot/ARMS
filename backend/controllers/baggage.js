const pool = require("../config/pool");
const { Queue } = require("bullmq");
const client = require("../client");

const baggageQueue = new Queue("baggageQueue", {
    connection: client
});

// REGISTER BAGGAGE
exports.registerBaggage = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { reservationId, scheduleId, tagNumber, weightKg, baggageType } = req.body;

        if (!reservationId || !scheduleId || !tagNumber || !weightKg || !baggageType) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (Number(weightKg) <= 0) {
            return res.status(400).json({ message: "Weight must be greater than zero" });
        }

        if (!["Checked", "Cabin", "Oversized"].includes(baggageType)) {
            return res.status(400).json({ message: "Invalid baggage type" });
        }

        await connection.beginTransaction();

        // Verify reservation and schedule
        const [reservations] = await connection.query(
            `SELECT sr.seat_reservation_id, sr.schedule_id,
                    sr.reservation_status, t.ticket_status
             FROM Seat_Reservation sr
             JOIN Ticket t ON t.ticket_id = sr.ticket_id
             WHERE sr.seat_reservation_id = ?
             FOR UPDATE`,
            [reservationId]
        );

        if (reservations.length === 0) {
            throw new Error("Reservation not found");
        }

        const reservation = reservations[0];

        if (reservation.schedule_id !== Number(scheduleId)) {
            throw new Error("Schedule does not match reservation");
        }

        if (reservation.reservation_status !== "Reserved") {
            throw new Error("Reservation is not active");
        }

        if (reservation.ticket_status !== "Checked-In") {
            throw new Error("Passenger must complete check-in first");
        }

        // Insert baggage
        const [result] = await connection.query(
            `INSERT INTO Baggage
             (reservation_id, tag_number, weight_kg, baggage_type,
              screening_status, baggage_status, schedule_id)
             VALUES (?, ?, ?, ?, 'Pending', 'Checked-In', ?)`,
            [reservationId, tagNumber, weightKg, baggageType, scheduleId]
        );

        // Add first baggage log
        await connection.query(
            `INSERT INTO Baggage_Log
             (baggage_id, location, status)
             VALUES (?, 'Check-in Counter', 'Checked-In')`,
            [result.insertId]
        );

        await connection.commit();

        res.status(201).json({
            message: "Baggage registered successfully",
            baggageId: result.insertId,
            tagNumber
        });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// GET BAGGAGE DETAILS
exports.getBaggage = async (req, res) => {
    try {
        const baggageId = Number(req.params.id);

        if (!Number.isInteger(baggageId) || baggageId <= 0) {
            return res.status(400).json({ message: "Invalid baggage ID" });
        }

        const [rows] = await pool.query(
            `SELECT b.*, p.full_name, t.ticket_number
             FROM Baggage b
             JOIN Seat_Reservation sr
                ON sr.seat_reservation_id = b.reservation_id
             JOIN Ticket t ON t.ticket_id = sr.ticket_id
             JOIN Booking_Passenger bp
                ON bp.booking_passenger_id = t.booking_passenger_id
             JOIN Passenger p ON p.passenger_id = bp.passenger_id
             WHERE b.baggage_id = ?`,
            [baggageId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Baggage not found" });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch baggage" });
    }
};

// GET BAGGAGE TRACKING HISTORY
exports.getBaggageHistory = async (req, res) => {
    try {
        const baggageId = Number(req.params.id);

        if (!Number.isInteger(baggageId) || baggageId <= 0) {
            return res.status(400).json({ message: "Invalid baggage ID" });
        }

        const [rows] = await pool.query(
            `SELECT location, status, recorded_at
             FROM Baggage_Log
             WHERE baggage_id = ?
             ORDER BY recorded_at ASC`,
            [baggageId]
        );

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch baggage history" });
    }
};





// UPDATE BAGGAGE STATUS
exports.updateBaggageStatus = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const baggageId = Number(req.params.id);
        const { status, location } = req.body;

        const allowedStatuses = [
            "Checked-In",
            "Screened",
            "Loaded",
            "In Transit",
            "Arrived",
            "Delivered",
            "Lost"
        ];

        if (!Number.isInteger(baggageId) || baggageId <= 0) {
            return res.status(400).json({ message: "Invalid baggage ID" });
        }

        if (!allowedStatuses.includes(status) || !location?.trim()) {
            return res.status(400).json({
                message: "Valid status and location are required"
            });
        }

        await connection.beginTransaction();

        // Lock baggage record
        const [rows] = await connection.query(
            `SELECT baggage_id, tag_number
             FROM Baggage
             WHERE baggage_id = ?
             FOR UPDATE`,
            [baggageId]
        );

        if (rows.length === 0) {
            throw new Error("Baggage not found");
        }

        // Update baggage status and location
        await connection.query(
            `UPDATE Baggage
             SET baggage_status = ?, current_location = ?
             WHERE baggage_id = ?`,
            [status, location.trim(), baggageId]
        );

        // Record status change in tracking history
        await connection.query(
            `INSERT INTO Baggage_Log (baggage_id, location, status)
             VALUES (?, ?, ?)`,
            [baggageId, location.trim(), status]
        );

        await connection.commit();
        // Add notification job to BullMQ
await baggageQueue.add("baggage-status-updated", {
    baggageId,
    tagNumber: rows[0].tag_number,
    status,
    location: location.trim()
});

        res.json({
            message: "Baggage status updated successfully",
            baggageId,
            status,
            location: location.trim()
        });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
};
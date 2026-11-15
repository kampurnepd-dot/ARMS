
const pool = require("../config/pool");
const crypto = require("crypto");

// 1. GET OPEN CHECK-IN COUNTERS
exports.getCounters = async (req, res) => {
    try {
        const airportId = Number(req.params.airportId);

        if (!Number.isInteger(airportId) || airportId <= 0) {
            return res.status(400).json({ message: "Invalid airport ID" });
        }

        const [counters] = await pool.query(
            `SELECT counter_id, airport_id, terminal_id,
                    counter_number, counter_status
             FROM Check_In_Counter
             WHERE airport_id = ?
             AND counter_status = 'Open'`,
            [airportId]
        );

        res.json(counters);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch counters" });
    }
};


// 2. CHECK IN PASSENGER
exports.checkIn = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const reservationId = Number(req.body.reservationId);
        const counterId = req.body.counterId
            ? Number(req.body.counterId)
            : null;

        if (!Number.isInteger(reservationId) || reservationId <= 0) {
            return res.status(400).json({ message: "Invalid reservation ID" });
        }

        await connection.beginTransaction();

        // Lock reservation to prevent simultaneous check-in
        const [reservations] = await connection.query(
            `SELECT seat_reservation_id, ticket_id, schedule_id,
                    reservation_status
             FROM Seat_Reservation
             WHERE seat_reservation_id = ?
             FOR UPDATE`,
            [reservationId]
        );

        if (reservations.length === 0) {
            throw new Error("Seat reservation not found");
        }

        const reservation = reservations[0];

        if (reservation.reservation_status !== "Reserved") {
            throw new Error("Reservation is not active");
        }

        // Check passenger, booking, ticket, flight and successful payment
        const [details] = await connection.query(
            `SELECT
                t.ticket_id,
                t.ticket_status,
                t.schedule_id AS ticket_schedule_id,
                b.booking_status,
                fs.schedule_id,
                fs.departure_time,
                fs.flight_status,
                fs.source_airport_id
             FROM Ticket t
             JOIN Booking_Passenger bp
                ON bp.booking_passenger_id = t.booking_passenger_id
             JOIN Booking b
                ON b.booking_id = bp.booking_id
             JOIN Flight_Schedule fs
                ON fs.schedule_id = ?
             WHERE t.ticket_id = ?
             AND t.schedule_id = ?
             AND t.ticket_status = 'Issued'
             AND b.booking_status = 'Confirmed'
             AND fs.flight_status IN ('Scheduled', 'Boarding')
             AND fs.departure_time > NOW()
             AND EXISTS (
                 SELECT 1
                 FROM Payment pay
                 WHERE pay.booking_id = b.booking_id
                 AND pay.payment_status = 'Success'
             )`,
            [
                reservation.schedule_id,
                reservation.ticket_id,
                reservation.schedule_id
            ]
        );

        if (details.length === 0) {
            throw new Error(
                "Check-in not allowed. Verify ticket, booking, payment and flight status."
            );
        }

        // If a counter is provided, verify that it is open
        if (counterId !== null) {
            if (!Number.isInteger(counterId) || counterId <= 0) {
                throw new Error("Invalid counter ID");
            }

            const [counters] = await connection.query(
                `SELECT counter_id
                 FROM Check_In_Counter
                 WHERE counter_id = ?
                 AND airport_id = ?
                 AND counter_status = 'Open'`,
                [counterId, details[0].source_airport_id]
            );

            if (counters.length === 0) {
                throw new Error("Counter is not open at the departure airport");
            }
        }

        // Generate a unique boarding pass number
        const boardingPassNumber =
            "BP" + crypto.randomBytes(9).toString("hex");

        // Insert check-in record
        const [result] = await connection.query(
            `INSERT INTO Check_In
             (reservation_id, counter_id, checkin_status,
              boarding_pass_number, boarding_status)
             VALUES (?, ?, 'Completed', ?, 'Not Boarded')`,
            [reservationId, counterId, boardingPassNumber]
        );

        // Update ticket status
        await connection.query(
            `UPDATE Ticket
             SET ticket_status = 'Checked-In'
             WHERE ticket_id = ?`,
            [reservation.ticket_id]
        );

        await connection.commit();

        res.status(201).json({
            message: "Check-in successful",
            checkinId: result.insertId,
            boardingPassNumber
        });

    } catch (error) {
        await connection.rollback();

        console.error(error);

        res.status(400).json({ message: error.message });

    } finally {
        connection.release();
    }
};


// 3. VIEW BOARDING PASS
exports.getBoardingPass = async (req, res) => {
    try {
        const checkinId = Number(req.params.id);

        if (!Number.isInteger(checkinId) || checkinId <= 0) {
            return res.status(400).json({ message: "Invalid check-in ID" });
        }

        const [rows] = await pool.query(
            `SELECT
                ci.checkin_id,
                ci.boarding_pass_number,
                ci.checkin_status,
                ci.checkin_time,
                ci.boarding_status,
                ci.boarded_at,
                p.full_name,
                p.passport_number,
                t.ticket_number,
                f.flight_number,
                fs.departure_time,
                fs.arrival_time,
                s.seat_number
             FROM Check_In ci
             JOIN Seat_Reservation sr
                ON sr.seat_reservation_id = ci.reservation_id
             JOIN Ticket t
                ON t.ticket_id = sr.ticket_id
             JOIN Booking_Passenger bp
                ON bp.booking_passenger_id = t.booking_passenger_id
             JOIN Passenger p
                ON p.passenger_id = bp.passenger_id
             JOIN Seat s
                ON s.seat_id = sr.seat_id
             JOIN Flight_Schedule fs
                ON fs.schedule_id = sr.schedule_id
             JOIN Flight f
                ON f.flight_id = fs.flight_id
             WHERE ci.checkin_id = ?`,
            [checkinId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Boarding pass not found" });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch boarding pass" });
    }
};


// 4. MARK PASSENGER AS BOARDED
exports.markBoarded = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const checkinId = Number(req.params.id);

        if (!Number.isInteger(checkinId) || checkinId <= 0) {
            return res.status(400).json({ message: "Invalid check-in ID" });
        }

        await connection.beginTransaction();

        const [rows] = await connection.query(
            `SELECT ci.checkin_id, ci.checkin_status,
                    ci.boarding_status, fs.flight_status
             FROM Check_In ci
             JOIN Seat_Reservation sr
                ON sr.seat_reservation_id = ci.reservation_id
             JOIN Flight_Schedule fs
                ON fs.schedule_id = sr.schedule_id
             WHERE ci.checkin_id = ?
             FOR UPDATE`,
            [checkinId]
        );

        if (rows.length === 0) {
            throw new Error("Check-in record not found");
        }

        if (rows[0].checkin_status !== "Completed") {
            throw new Error("Check-in is not completed");
        }

        if (rows[0].boarding_status !== "Not Boarded") {
            throw new Error("Passenger is already boarded or cannot board");
        }

        if (rows[0].flight_status !== "Boarding") {
            throw new Error("Flight is not currently boarding");
        }

        await connection.query(
            `UPDATE Check_In
             SET boarding_status = 'Boarded',
                 boarded_at = NOW()
             WHERE checkin_id = ?`,
            [checkinId]
        );

        await connection.commit();

        res.json({ message: "Passenger successfully boarded" });

    } catch (error) {
        await connection.rollback();

        console.error(error);
        res.status(400).json({ message: error.message });

    } finally {
        connection.release();
    }
};

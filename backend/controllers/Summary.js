const pool = require("../config/pool");
const client = require("../client");
const crypto = require("crypto");

// same secret as booking.js
const GUEST_SECRET = process.env.GUEST_SECRET || "change-this-secret";

// booking id from the Redis guest session (same lookup as seat_reserve in booking.js)
async function getSessionBookingId(req){
    const guest_token = req.cookies?.guest_session;
    if(!guest_token) return null;
    const hashedtoken = crypto.createHmac("sha256" ,guest_token)
         .update(GUEST_SECRET)
         .digest("hex");
    return await client.get(`guest:${hashedtoken}`);
}


// GET /booking/summary
async function getBookingSummary(req,res){
    try{
        const bookingId = await getSessionBookingId(req);
        if(!bookingId) return res.status(401).json({ error: "session_expired" });

        const [bookings] = await pool.query(`
            select b.booking_reference,
                   b.booking_status,
                   b.total_amount,
                   b.currency,
                   f.flight_number,
                   src.airport_code as from_code,
                   src.city as from_city,
                   dst.airport_code as to_code,
                   dst.city as to_city,
                   fs.departure_time,
                   fs.arrival_time
            from Booking b
            join Flight_Schedule fs on fs.schedule_id = b.schedule_id
            join Flight f on f.flight_id = fs.flight_id
            join Airport src on src.airport_id = fs.source_airport_id
            join Airport dst on dst.airport_id = fs.destination_airport_id
            where b.booking_id = ?
        `,[bookingId]);

        if(bookings.length === 0){
            return res.status(404).json({
                success:false,
                message:"Booking not found"
            });
        }

        // one row per passenger; ticket and cancellation columns are NULL until they exist
        const [passengers] = await pool.query(`
            select p.full_name as passenger_name,
                   s.seat_number,
                   t.ticket_id,
                   t.ticket_number,
                   t.ticket_status,
                   t.fare_amount,
                   t.tax_amount,
                   c.cancellation_id
            from Booking_Passenger bp
            join Passenger p on p.passenger_id = bp.passenger_id
            left join Ticket t on t.booking_passenger_id = bp.booking_passenger_id
            left join Seat_Reservation sr
                   on sr.seat_reservation_id = (
                        select max(seat_reservation_id)
                        from Seat_Reservation
                        where booking_passenger_id = bp.booking_passenger_id)
            left join Seat s on s.seat_id = sr.seat_id
            left join Cancellation c
                   on c.cancellation_id = (
                        select max(cancellation_id)
                        from Cancellation
                        where ticket_id = t.ticket_id
                          and cancellation_status <> 'Rejected')
            where bp.booking_id = ?
            order by bp.booking_passenger_id
        `,[bookingId]);

        return res.json({
            success:true,
            booking: bookings[0],
            passengers
        });

    }catch(err){
        console.error("Booking summary error:", err);
        return res.status(500).json({
            success:false,
            message:"Could not load booking"
        });
    }
}


// GET /refund/:cancellationId
async function getRefundStatus(req,res){
    const cancellationId = Number(req.params.cancellationId);

    if(!Number.isInteger(cancellationId) || cancellationId <= 0){
        return res.status(400).json({
            success:false,
            message:"Invalid cancellation id"
        });
    }

    try{
        const bookingId = await getSessionBookingId(req);
        if(!bookingId) return res.status(401).json({ error: "session_expired" });

        // only the booking in this session can see its own refunds
        const [rows] = await pool.query(`
            select r.refund_id,
                   r.amount,
                   r.refund_status,
                   r.refund_reference,
                   r.requested_at,
                   r.processed_at
            from Refund r
            join Cancellation c on c.cancellation_id = r.cancellation_id
            where r.cancellation_id = ?
              and c.booking_id = ?
            order by r.refund_id desc
            limit 1
        `,[cancellationId, bookingId]);

        if(rows.length === 0){
            return res.status(404).json({
                success:false,
                message:"No refund found for this cancellation"
            });
        }

        return res.json({ success:true, refund: rows[0] });

    }catch(err){
        console.error("Refund status error:", err);
        return res.status(500).json({
            success:false,
            message:"Could not load refund"
        });
    }
}

module.exports = { getBookingSummary, getRefundStatus };
const pool = require("../config/pool");

const { Queue } = require("bullmq");
const crypto = require("crypto");
const client = require("../client");

// same secret as booking.js
const GUEST_SECRET = process.env.GUEST_SECRET || "change-this-secret";


const refundQueue = new Queue("refundQueue",{
    connection:{
        host:"127.0.0.1",
        port:6379, // FIX: was 6397, the worker listens on 6379
    },
})


async function initiatecancellation(req, res) {
    const { ticket_id, cancellation_reason } = req.body;

    // booking id comes from the Redis guest session (same as seat_reserve in booking.js)
    const guest_token = req.cookies?.guest_session;
    if(!guest_token) return res.status(401).json({ error: "session_expired" });
    const hashedtoken = crypto.createHmac("sha256" ,guest_token)
         .update(GUEST_SECRET)
         .digest("hex");
    const booking_id = await client.get(`guest:${hashedtoken}` );
    if(!booking_id) return res.status(401).json({ error: "session_expired" });

    if (
        !Number.isInteger(Number(booking_id)) ||
        Number(booking_id) <= 0 ||
        !Number.isInteger(Number(ticket_id)) ||
        Number(ticket_id) <= 0 ||
        typeof cancellation_reason !== "string" ||
        cancellation_reason.trim() === ""
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid cancellation details"
        });
    }

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

       
        const [booking] = await conn.query(`
            select b.booking_id,
                   b.booking_status,
                   fs.departure_time
            from Booking b
            join Flight_Schedule fs
                on fs.schedule_id = b.schedule_id
            where b.booking_id = ?
            for update of b
        `, [Number(booking_id)]); // FIX: "of b" locks only the booking, not the whole flight schedule row

        if (booking.length === 0) {
            await conn.rollback();
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (booking[0].booking_status !== "Confirmed") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Only confirmed bookings can be cancelled"
            });
        }

       
        const departureTime = new Date(booking[0].departure_time);
        const cutoffTime = departureTime.getTime() - (3 * 60 * 60 * 1000);

        if (Date.now() >= cutoffTime) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Cancellation is not allowed within 3 hours of departure"
            });
        }

       
        const [tickets] = await conn.query(`
           select t.ticket_id, t.ticket_status
            from Ticket t
            join Booking_Passenger bp
                on bp.booking_passenger_id = t.booking_passenger_id
            where bp.booking_id = ?
              and t.ticket_id = ?
            for update
        `, [Number(booking_id), Number(ticket_id)]);

        if (tickets.length === 0) {
            await conn.rollback();
            return res.status(404).json({
                success: false,
                message: "Ticket does not belong to this booking"
            });
        }

        if (tickets[0].ticket_status !== "Issued") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "This ticket cannot be cancelled"
            });
        }

        
        const [existing] = await conn.query(`
            select cancellation_id
            from Cancellation
            where ticket_id = ?
              and cancellation_status IN ('Requested', 'Approved')
            for update
        `, [Number(ticket_id)]);

        if (existing.length > 0) {
            await conn.rollback();
            return res.status(409).json({
                success: false,
                message: "Cancellation request already exists"
            });
        }

        const [cancelinsert] = await conn.query(`
            INSERT INTO Cancellation (
                booking_id,
                ticket_id,
                cancellation_reason,
                cancellation_status
            )
            VALUES (?, ?, ?, 'Requested')
        `, [
            Number(booking_id),
            Number(ticket_id),
            cancellation_reason.trim()
        ]);

        await conn.commit();

        return res.status(201).json({
            success: true,
            cancellation_id: cancelinsert.insertId,
            message: "Cancellation request submitted",
            cancellation_status: "Requested"
        });

    } catch (err) {
        await conn.rollback();
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Cancellation initiation failed"
        });
    } finally {
        conn.release();
    }
}


async function passCancellation(req,res){
    const {cancellation_id,result} = req.body;
    if(!Number.isInteger(Number(cancellation_id))||
        Number(cancellation_id)<0 || 
    !['Requested','Approved','Rejected','Completed'].includes(result)){

        return res.status(401).json({
            success:false,
            message:"Invalid cancellation details"
        })
    }
 const conn = await pool.getConnection();

 try{
    await conn.beginTransaction();

    const [cancel]= await conn.query(`
         select c.cancellation_id,
            c.booking_id,
            c.cancellation_status,
            b.booking_status,
            b.schedule_id

            from Cancellation c
            join Booking b
            on b.booking_id = c.booking_id
            where c.cancellation_id  = ?

        `,[cancellation_id]); // FIX: await, and the missing comma after c.cancellation_status

        if(cancel.length === 0){
            await conn.rollback();
            return res.status(401).json({
                success:false,
                message:"Cancellation req not found"
            })
        }

        const [booking] = await conn.query(`
            select b.booking_id,b.booking_status,b.schedule_id,
            fs.departure_time
            from Booking b
            join Flight_Schedule fs
            on fs.schedule_id = b.schedule_id
            where b.booking_id = ?
            for update of b
            `,[cancel[0].booking_id]); // FIX: select departure_time (3-hour check used undefined), cancel is an array, lock booking so two ticket cancellations can't miss "last ticket"

            if(booking.length === 0){

                await conn.rollback();

                return res.status(401).json({
                    success:false,
                    message:"Booking Not Found"
                });
            }

       const [c] = await conn.query(`
            SELECT cancellation_id,
                   booking_id,
                   ticket_id,
                   cancellation_status
            FROM Cancellation
            WHERE cancellation_id = ?
            FOR UPDATE
        `, [Number(cancellation_id)]);

        if(c.length === 0){ // FIX: guard before c[0]
            await conn.rollback();
            return res.status(401).json({
                success:false,
                message:"Cancellation req not found"
            })
        }

        const current = c[0];

         if (current.cancellation_status === "Requested") {

            if (result === "Approved") {

                await conn.query(`
                    UPDATE Cancellation
                    SET cancellation_status = 'Approved'
                    WHERE cancellation_id = ?
                `, [cancellation_id]);

            } else if (result === "Rejected") {

                await conn.query(`
                    UPDATE Cancellation
                    SET cancellation_status = 'Rejected'
                    WHERE cancellation_id = ?
                `, [cancellation_id]);

            } else {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: "A requested cancellation must first be approved or rejected"
                });
            }

            await conn.commit();

            return res.status(200).json({
                success: true,
                message: `Cancellation ${result.toLowerCase()} successfully`,
                cancellation_status: result
            });
        }

        if (
            current.cancellation_status !== "Approved" ||
            result !== "Completed"
        ) {
            await conn.rollback();

            return res.status(400).json({
                success: false,
                message: "Invalid cancellation status transition"
            });
        }

        const departureTime = new Date(booking[0].departure_time);
        const cutoffTime =
            departureTime.getTime() - (3 * 60 * 60 * 1000);

        if (Date.now() >= cutoffTime) {
            await conn.rollback();

            return res.status(400).json({
                success: false,
                message: "Cancellation cannot be completed within 3 hours of departure"
            });
        }

        const [ticket] = await conn.query(`
            SELECT ticket_id,
                   booking_passenger_id,
                   ticket_status,
                   fare_amount,
                   tax_amount
            FROM Ticket
            WHERE ticket_id = ?
            FOR UPDATE
        `, [current.ticket_id]);

        if (
            ticket.length === 0 ||
            ticket[0].ticket_status !== "Issued"
        ) {
            await conn.rollback();

            return res.status(400).json({
                success: false,
                message: "Ticket cannot be cancelled"
            });
        }

        await conn.query(`
            UPDATE Ticket
            SET ticket_status = 'Cancelled'
            WHERE ticket_id = ?
        `, [current.ticket_id]);

        await conn.query(`
            UPDATE Seat_Reservation
            SET reservation_status = 'Cancelled'
            WHERE ticket_id = ?
              AND reservation_status = 'Reserved'
        `, [current.ticket_id]);

        const [payments] = await conn.query(`
            SELECT payment_id
            FROM Payment
            WHERE booking_id = ?
              AND payment_status = 'Success'
            LIMIT 1
            FOR UPDATE
        `, [current.booking_id]);

        let refundId = null; // FIX: remember the refund id, enqueue only after commit

        //refund
        if (payments.length > 0) {

            const refundAmount =
                Number(ticket[0].fare_amount) +
                Number(ticket[0].tax_amount);


                const refundReference = crypto.randomUUID();
             const [refundreceipt] = await conn.query(`
                INSERT INTO Refund (
                    cancellation_id,
                    amount,
                    refund_status,
                    refund_reference
                )
                VALUES (?, ?, 'Requested', ?)
            `, [cancellation_id, refundAmount,refundReference]); // FIX: 4 columns need 4 values

            refundId = refundreceipt.insertId;

        }

        
        const [remaining] = await conn.query(`
            SELECT COUNT(*) AS active_tickets
            FROM Ticket t
            JOIN Booking_Passenger bp
                ON bp.booking_passenger_id = t.booking_passenger_id
            WHERE bp.booking_id = ?
              AND t.ticket_status <> 'Cancelled'
        `, [current.booking_id]);

        if (Number(remaining[0].active_tickets) === 0) {
            await conn.query(`
                UPDATE Booking
                SET booking_status = 'Cancelled'
                WHERE booking_id = ?
            `, [current.booking_id]);
        }

        
        await conn.query(`
            UPDATE Cancellation
            SET cancellation_status = 'Completed'
            WHERE cancellation_id = ?
        `, [cancellation_id]);

        await conn.commit();

        // FIX: moved here from inside the transaction, so the worker never sees a refund row that isn't committed yet
        if(refundId){
            try{
                await refundQueue.add("refundthis",{
                    refund_id:refundId
                },
                {
                    jobId:`refund-${refundId}`,
                    attempts:3,
                    backoff:{
                        type:"exponential",
                        delay:5000
                    }

                }
            )
            }catch(queueErr){
                // refund row is saved as 'Requested', so it can be re-queued later
                console.error("Could not queue refund",refundId,queueErr);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Cancellation completed successfully",
            cancellation_status: "Completed",
            refund_status:
                payments.length > 0 ? "Requested" : "Not applicable"
        });





 }catch (err) {
        await conn.rollback();
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Cancellation processing failed"
        });
    } finally {
        conn.release();
    }

}



module.exports = {
    initiatecancellation,
    passCancellation,
    refundQueue
};
const pool = require("../config/pool");
const { Worker } = require("bullmq");
const { bookingqueue } = require("../controllers/booking");

const worker = new Worker(
  "bookingqueue",
  async (job) => {
    const { bookingId } = job.data;

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [booking] = await conn.query(
        `SELECT booking_id, booking_status
                 FROM Booking
                 WHERE booking_id = ?
                 FOR UPDATE`,
        [bookingId],
      );

      if (booking.length === 0 || booking[0].booking_status !== "Pending") {
        await conn.commit();
        return;
      }

      await conn.query(
        `
    UPDATE Seat_Reservation sr
    JOIN Booking_Passenger bp
        ON sr.booking_passenger_id = bp.booking_passenger_id
    SET sr.reservation_status = 'Released'
    WHERE bp.booking_id = ?
    AND sr.reservation_status = 'Reserved'
`,
        [bookingId],
      );

      await conn.query(
        `UPDATE Booking
                 SET booking_status = ?
                 WHERE booking_id = ?`,
        ["Expired", bookingId],
      );

      await conn.commit();

      console.log(`Booking ${bookingId} expired successfully`);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
  {
    connection: {
      host: "127.0.0.1",
      port: 6379,
    },
  },
);

worker.on("completed", (job, result) => {
  console.log("Job completed", job.id, result);
});

worker.on("failed", (job, err) => {
  console.log("Job failed", job?.id, err.message);
});

worker.on("error", (err) => {
  console.log("Error: ", err);
});

const pool = require("../config/pool");
const client = require("../client");
const crypto = require("crypto");
const { Queue } = require("bullmq"); // FIX: Queue was never imported (npm i bullmq)

// FIX: guests have no user.password, so a server secret is used instead
const GUEST_SECRET = process.env.GUEST_SECRET || "change-this-secret";

const bookingqueue = new Queue("bookingqueue",{
  connection: {
    host: "127.0.0.1",
    port: 6379,
  }});


async function FlightSearch(req,res) {
    const{dept_airport_code,arr_airport_code,date, passengers} = req.body;
       const passengerCount = Number(passengers);
try  {
        if (
            !dept_airport_code ||
            !arr_airport_code ||
            !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
            !Number.isInteger(passengerCount) ||
            passengerCount < 1
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid search parameters"
            });}
            const cachedkey = `flight:${dept_airport_code}:${arr_airport_code}:${date}:${passengerCount}`;
            const cached = await client.get(cachedkey);
             if (cached !== null) {
            return res.json({
                success: true,
                source: "redis",
                fly: JSON.parse(cached)
            });
        }
      


     const [Flights] = await pool.query(
        `select 
        fs.schedule_id,
        fs.flight_id,
        a.airline_name,
        fs.aircraft_id,
        fs.departure_time,
        fs.arrival_time,
        fp.cabin_class,
         fp.base_price,

        COUNT(s.seat_id) AS total_seats,
      
        COUNT(sr.seat_reservation_id) AS booked_seats,
        COUNT(s.seat_id) - COUNT(sr.seat_reservation_id)
        AS seats_available
        from Flight_Schedule as fs
        JOIN Airport AS dep
        ON fs.source_airport_id = dep.airport_id
        JOIN Airport AS arr
        ON fs.destination_airport_id = arr.airport_id
        JOIN  Flight as f
        ON fs.flight_id = f.flight_id
        JOIN Airline as a
        ON f.airline_id = a.airline_id
        join Flight_Fare as fp
        on fs.schedule_id = fp.schedule_id 
        JOIN Seat AS s
        ON fs.aircraft_id = s.aircraft_id
        AND fp.cabin_class = s.cabin_class
        AND s.seat_status = 'Active'
        left join  Seat_Reservation as sr
        on fs.schedule_id = sr.schedule_id
         and  sr. reservation_status = 'Reserved' and
         sr.seat_id = s.seat_id
       
         WHERE dep.airport_code = ?
              AND arr.airport_code = ?
              AND fs.departure_time >= ?
              AND fs.departure_time < DATE_ADD(?, INTERVAL 1 DAY)
              AND fs.departure_time > NOW()
              AND fs.flight_status IN ('Scheduled', 'Delayed')    
        group by fs.schedule_id, fp.cabin_class
        

        Having   seats_available >= ? `,[dept_airport_code,arr_airport_code,date,date,passengerCount]
      ) ;
    await client.set(cachedkey,JSON.stringify(Flights), "EX", 30 );
     return res.json({
                success: true,
                source: "mysql",
                fly: Flights
            });


        }
        catch (error) {
        console.error("Flight search error:", error);

        return res.status(500).json({
            success: false,
            message: "Flight search failed"
        });
    }
}


async function listAirports(req,res) {
    try {
         const cached = await client.get("airport:all");
             if (cached !== null) {
            return res.json({
                success: true,
                source: "redis",
                port: JSON.parse(cached)
            });

    }


    const [Airport] = await pool.query(`
        select 
        airport_id,
    airport_code,
    name,
    city,
    country 
    FROM Airport
    ORDER BY city`);
    await client.set("airport:all", JSON.stringify(Airport), "EX", 3600);
     return res.json({
                success: true,
                source: "mysql",
                port: Airport
            });




}
      catch (error) {
        console.error("can't airport fetch error:", error);

        return res.status(500).json({
            success: false,
            message: "airport fetch failed"
        });
    }

}


async function booking(req,res) {
    
    const{ email, phoneno, schedule_id,passengers,cabin_class} = req.body;

     if (
        !email ||
        !Number.isInteger(Number(schedule_id)) ||
        Number(schedule_id) <= 0 ||
        !["Economy", "Premium", "Business", "First"].includes(cabin_class) ||
        !Array.isArray(passengers) ||
        passengers.length === 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid booking details"
        });
    }

    
     
    const conn = await pool.getConnection();

    let bookingId;          // FIX: declared here so the second try block can use it
    let bookingReference;   // FIX: same
    let totalCost;          // FIX: same

    try {
        await conn.beginTransaction(); // FIX: was start_Transcation

        const [flights] = await conn.query( // FIX: was pool.query (must use the transaction connection)
        `select fs.schedule_id, ff.cabin_class, ff.base_price
        from  Flight_Schedule  as fs
        join  Flight_Fare as ff
        on fs.schedule_id = ff.schedule_id
        where fs.schedule_id =? and ff.cabin_class = ?`
        ,[schedule_id,cabin_class]
     );

        // FIX: flights[0] crashed when no fare was found
        if (flights.length === 0) {
            await conn.rollback();
            return res.status(404).json({
                success: false,
                message: "Fare not available for this flight"
            });
        }

       
         totalCost =
            Number(flights[0].base_price) * passengers.length;
    
        bookingReference = "PNR"+crypto.randomBytes(4)
                           .toString("hex")
                           .toUpperCase()
                           .slice(0, 7);
 const [booking] = await conn.query(`INSERT INTO Booking 
(booking_reference, booking_status, contact_email, total_amount, currency,schedule_id) 
VALUES
(?,'Pending',?, ?, 'INR',?)`,[bookingReference,email,totalCost,schedule_id]);

 bookingId = booking.insertId;


for(let passenger of passengers) {
   const [pass] =  await conn.query(`INSERT INTO Passenger (full_name, email, phone,passport_number, date_of_birth) VALUES
(?,?,?,?,?)`,[passenger.name,passenger.email,passenger.phone,passenger.passportno,passenger.dateofbirth]);



let pass_id = pass.insertId;

 await conn.query(`INSERT INTO Booking_Passenger (booking_id, passenger_id, passenger_type, created_at) VALUES
(?,?,?,NOW())`,[bookingId,pass_id,passenger.status||"Adult"]); // FIX: 4 columns but only 3 values


   }

   await conn.commit(); // FIX: commit was missing, so nothing was saved

    }
    catch(error) {
        
         if (conn) {
            await conn.rollback();
        }

        console.error("Booking error:", error);

        return res.status(500).json({
            success: false,
            message: "Booking creation failed"
        });


    }
    finally {
         if (conn) {
            conn.release();
        }
    }








   



try {


 const guest_token = crypto.randomBytes(16).toString("hex"); // FIX: toString() without "hex" gives garbage
    const hashedtoken = crypto.createHmac("sha256" ,guest_token) // FIX: createHmac was not imported
         .update(GUEST_SECRET) // FIX: user.password does not exist
         .digest("hex");


await client.set(`guest:${hashedtoken}`, // FIX: was hashedToken (different name)
            String(bookingId), "EX", 600 );

  res.cookie("guest_session", guest_token, { // FIX: was guestToken (different name)
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 30 * 60 * 1000
        });

        return res.status(201).json({
            success: true,
            booking_reference: bookingReference,
            total_amount: totalCost,
            message: "Booking created successfully"
        });


}

catch(error) {
     console.error("Guest session error:", error);
        return res.status(503).json({
            success: false,
            message: "Booking created but session setup failed"
        });
    }

}







async function seat_reserve(req,res) {
     const guest_token = req.cookies?.guest_session;
    if(!guest_token) return res.status(401).json({ error: "session_expired" }); // FIX: guest_session is not a variable
     const hashedtoken = crypto.createHmac("sha256" ,guest_token) // FIX: createHmac import
         .update(GUEST_SECRET) // FIX: user.password does not exist
         .digest("hex");

         const bookingId = await client.get(`guest:${hashedtoken}` ); // FIX: was hashedToken
           if(!bookingId) return res.status(401).json({ error: "session_expired" });

           const {seatnos = []}  =  req.body;

            let selectedSeats; // FIX: was never declared
            const conn = await pool.getConnection();
           try {
            await conn.beginTransaction(); // FIX: was start_Transcation
        const [bookings] = await conn.query(
            `SELECT schedule_id, booking_status
             FROM Booking
             WHERE booking_id = ?
             FOR UPDATE`,
            [bookingId]
        );

        if (
            bookings.length === 0 ||
            bookings[0].booking_status !== "Pending"
        ) {
            throw new Error("Booking unavailable");
        }

        const scheduleId = bookings[0].schedule_id;



        const [flights] = await conn.query(
            `SELECT aircraft_id
             FROM Flight_Schedule
             WHERE schedule_id = ?`,
            [scheduleId]
        );

        if (flights.length === 0) {
            throw new Error("Flight not found");
        }

        const aircraftId = flights[0].aircraft_id;



         const[passengers] = await conn.query(
            `select bp.booking_passenger_id 
            from Booking as b
            join Booking_Passenger  as bp
            on bp.booking_id = b.booking_id
            where b.booking_id = ?`,[bookingId]
         ); // FIX: b.booking_d typo

         
        const passengerCount = passengers.length;

        if (passengerCount === 0) {
            throw new Error("No passengers found");
        }

        if (
            seatnos.length !== 0 &&
            seatnos.length !== passengerCount
        ) {
            throw new Error(
                "Seat count must match passenger count"
            );
        }
       

         const [existing] = await conn.query(
            `SELECT sr.seat_reservation_id
             FROM Seat_Reservation sr
             JOIN Booking_Passenger bp
               ON bp.booking_passenger_id =
                  sr.booking_passenger_id
             WHERE bp.booking_id = ?
               AND sr.reservation_status = 'Reserved'
             LIMIT 1`,
            [bookingId]
        );

        if (existing.length > 0) {
            throw new Error("Seats already reserved");
        }

        if(seatnos.length>0) {
             if (new Set(seatnos).size !== seatnos.length) {
                throw new Error("Duplicate seat numbers");
            }

            const [seats] = await conn.query(
            `select seat_id, seat_number          
            from Seat 
           where  aircraft_id = ?
            AND seat_status = 'Active' and seat_number IN (?)
           ORDER BY seat_id
            for update
            `,[aircraftId,seatnos]
           );
            if (seats.length !== passengerCount) {
                throw new Error("Invalid seat selection");
            }

const seatMap = new Map(
                seats.map(s => [s.seat_number, s])
            );

            selectedSeats = seatnos.map(
                number => seatMap.get(number)
            );
          



        }
        else {
            const [seats] = await conn.query(
              `  select seat_id, seat_number          
            from Seat as s
           where  aircraft_id = ?
            AND seat_status = 'Active' 
            AND not exists (
            select 1
            FROM Seat_Reservation sr
            WHERE sr.schedule_id = ?
             AND sr.seat_id = s.seat_id
             AND sr.reservation_status = 'Reserved' )
           ORDER BY seat_id
             LIMIT ?
            for update
            `,[aircraftId,scheduleId,passengerCount]
            ) // FIX: alias "s" was used but never defined
 if (seats.length !== passengerCount) {
                throw new Error("Not enough seats available");
            }

            selectedSeats = seats;


        }


           const seatIds = selectedSeats.map(s => s.seat_id);

        const [reserved] = await conn.query(
            `SELECT seat_id
             FROM Seat_Reservation
             WHERE schedule_id = ?
               AND seat_id IN (?)
               AND reservation_status = 'Reserved'`,
            [scheduleId, seatIds]
        );

        if (reserved.length > 0) {
            throw new Error("One or more seats already reserved");
        }


         
let manualSelection = seatnos.length > 0;
let seatFees = 0;
for (let i = 0; i < passengers.length; i++) { // FIX: booking_passengers is not defined, variable is "passengers"
    const passengerId =
        passengers[i].booking_passenger_id;

    const seatId = selectedSeats[i].seat_id;

    let price = 0;

    
    if (manualSelection) {
        const [prices] = await conn.query(
            `SELECT price
             FROM Seat_Pricing
             WHERE schedule_id = ?
               AND seat_id = ?`,
            [scheduleId, seatId]
        );

        price = prices.length
            ? Number(prices[0].price)
            : 0;
    }

    await conn.query(
        `INSERT INTO Seat_Reservation
         (booking_passenger_id, seat_id, schedule_id,
          reservation_status, price)
         VALUES (?, ?, ?, 'Reserved', ?)`,
        [passengerId, seatId, scheduleId, price]
    );
    seatFees += price;
}



await conn.commit();
await bookingqueue.add("expirebooking",{booking:bookingId},
      {
        delay: 600000,
        jobId: `expire-${bookingId}`,

        attempts:3,

        backoff:{
          type:"exponential",
          delay:1000
        },
        removeOnComplete:true



    }
   );
    

   const io = req.app.get("io");

io.to(`flight:${scheduleId}`).emit("seat-update", {
    schedule_id: scheduleId,
    seats: selectedSeats.map(seat => ({
        seat_id: seat.seat_id,
        seat_number: seat.seat_number,
        seat_status: "Booked"
    }))
});     
         
// FIX: no response was sent on success, so the request hung
return res.status(200).json({
    success: true,
    seats: selectedSeats.map(seat => ({
        seat_id: seat.seat_id,
        seat_number: seat.seat_number
    })),
    seat_fees: seatFees
});

}



        
catch(error) {
        
         if (conn) {
            await conn.rollback();
        }

        console.error("Seat reserve error:", error); // FIX: label said "Booking error"

        return res.status(500).json({
            success: false,
            message: "Seat reservation failed" // FIX: message said "Booking creation failed"
        });


    }
    finally {
         if (conn) {
            conn.release();
        }
    }
           


    


  
}


async function seat_price_avaliability(req,res) {
    try{
     const guest_token = req.cookies?.guest_session;
    if(!guest_token) return res.status(401).json({ error: "session_expired" }); // FIX: guest_session is not a variable
     const hashedtoken = crypto.createHmac("sha256" ,guest_token) // FIX: createHmac import
         .update(GUEST_SECRET) // FIX: user.password does not exist
         .digest("hex");

         const bookingId = await client.get(`guest:${hashedtoken}` ); // FIX: was hashedToken
           if(!bookingId) return res.status(401).json({ error: "session_expired" });

   const [seats] = await pool.query( // FIX: conn does not exist in this function
    `SELECT
        s.seat_id,
        s.seat_number,
        COALESCE(sp.price, 0) AS price

     FROM Booking AS b

     JOIN Flight_Schedule AS fs
       ON fs.schedule_id = b.schedule_id

     JOIN Seat AS s
       ON s.aircraft_id = fs.aircraft_id

     LEFT JOIN Seat_Pricing AS sp
       ON sp.seat_id = s.seat_id
      AND sp.schedule_id = b.schedule_id

     WHERE b.booking_id = ?
       AND s.seat_status = 'Active'
       AND NOT EXISTS (
           SELECT 1
           FROM Seat_Reservation AS sr
           WHERE sr.seat_id = s.seat_id
             AND sr.schedule_id = b.schedule_id
             AND sr.reservation_status = 'Reserved'
       )

     ORDER BY s.seat_id`,
    [bookingId]
);
    return res.status(200).json({
            success: true,
            seats
        });
    
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch seats"
        });
    }
}




module.exports = {FlightSearch,listAirports,booking,seat_reserve,seat_price_avaliability,bookingqueue};
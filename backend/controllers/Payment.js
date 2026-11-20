const pool = require("../config/pool");
const crypto = require("crypto");
const {bookingqueue} = require("./booking");
const client = require("../client");


const GUEST_SECRET = process.env.GUEST_SECRET || "change-this-secret";


async function Initiatepayment(req,res){
    const {total_fare, paymentMethod} = req.body;

    
    const guest_token = req.cookies?.guest_session;
    if(!guest_token) return res.status(401).json({ error: "session_expired" });
    const hashedtoken = crypto.createHmac("sha256" ,guest_token)
         .update(GUEST_SECRET)
         .digest("hex");
    const booking_id = await client.get(`guest:${hashedtoken}` );
    if(!booking_id) return res.status(401).json({ error: "session_expired" });
    if(!Number.isInteger(Number(booking_id))||
        !['Credit Card','Debit Card','UPI','Net Banking','Wallet'].includes(paymentMethod)||
        total_fare <=0
    ){
        return res.status(400).json({
            success:false,
            message:"Invalid Payment details"
        });
    }

    const conn = await pool.getConnection();
    try{ 
        await conn.beginTransaction();
        const [tf] = await conn.query(`
            select booking_id , total_amount , booking_status
            from Booking where booking_id = ?
            for update 
            `,[booking_id]);

        
        if(tf.length ===0 || tf[0].booking_status !== "Pending" || tf[0].total_amount != total_fare){
            await conn.rollback(); // FIX: await
            return res.status(400).json({
                success: false,
                message: "Booking not found or not pending"
            });
        }
         const [exists] = await conn.query(`
            select payment_id from 
            Payment where booking_id = ? 
            and payment_status in ('Pending','Success')
            for update`,[booking_id]) ; 

            if(exists.length >0){
                await conn.rollback(); 

                return res.status(409).json({
                    success:false,
                    message:"Pending payment already exists",
                    payment_id : exists[0].payment_id
                })
            }

        const transaction_reference = crypto.randomUUID();

        const [payment_details] = await conn.query(`
        insert into Payment( booking_id, amount, payment_method, payment_status, transaction_reference)
        values(?,?,?,"Pending",?)
        `,[booking_id,total_fare,paymentMethod,transaction_reference]); 

        await conn.commit();

    
        try{
            await client.set(`payment:${payment_details.insertId}`,
                JSON.stringify({
                    payment_id: payment_details.insertId,
                    booking_id: booking_id,
                    amount: total_fare,
                    payment_method: paymentMethod,
                    payment_status: "Pending"
                }),"EX",600);
        }catch(redisErr){
            console.log("Redis error",redisErr);
        }

        return res.status(201).json({
            success:true,
            payment_id:payment_details.insertId,
            message:"Payment Initiated",
            transaction_reference,
            amount:tf[0].total_amount,
            payment_status:"Pending"

        })
    }catch(err){
        await conn.rollback();
        console.log("Error",err);

        return res.status(500).json({
            success:false,
            message:"Payment initiation failed"
        })
    }finally{
         conn.release();
    }
         

}

async function passPayment(req,res){
     const {payment_id ,result} = req.body;

    if(!Number.isInteger(Number(payment_id))||
        Number(payment_id)<0 ||
         !['Pending','Success','Failed','Refunded'].includes(result)){
           
            return res.status(401).json({
                success:false,
                message:"Invalid Payment Details"
            })
        }

        const conn =  await pool.getConnection();
             
        try{
             await conn.beginTransaction();

         const [payments] = await conn.query(`
            select p.payment_id,
            p.booking_id,p.amount,
            p.payment_method,
            p.payment_status,
            b.booking_status,
            b.schedule_id

            from Payment p
            join Booking b
            on b.booking_id = p.booking_id
            where payment_id  = ?
            for update

            `,[payment_id]); 

            if(payments.length === 0){
                await conn.rollback();
                 return res.status(401).json({
                    success:false,
                    message:"No Payment found"
                 })
            }

            const current = payments[0];

            if(current.payment_status !== "Pending"){
                await conn.rollback();
                return res.status(400).json({
                    success:false,
                    message:"Payment is already processed"
                })
            }
            if(current.booking_status !== "Pending"){
            await conn.rollback();
            return res.status(400).json({
                success:false,
                message:"Booking is already Processed"
            })
            }

            if(result === "Pending"){
                 await conn.commit();



                 return res.json({
                    message:"Payment is still pending"
                 });
            }

            if(result === "Failed"){
                const [restorePayment] = await conn.query(`
                    update Payment
                    set payment_status = "Failed"
                    where payment_id = ?`,[payment_id]); 

                await conn.commit();

                try{ 
                    await client.set(
    `payment:${payment_id}`,
    JSON.stringify({
        payment_id: payment_id,
        booking_id: current.booking_id,
        amount: current.amount,
        payment_method: current.payment_method,
        payment_status: "Failed"
    }),
    "EX",
    600
);
                }catch(redisErr){
                    console.log("Redis error",redisErr);
                }

                return res.json({
                    success:true,
                    message:"Payment Failed ,try again"
                })

            }
            if(result === "Success"){
                const [restorePayment] = await conn.query(`
                    update Payment
                    set payment_status = "Success"
                    where payment_id =?
                    `,[payment_id]) 

                const [changeBooking] = await conn.query(`
                    update Booking
                    set booking_status = "Confirmed"
                    where booking_id = ?
                    `,[current.booking_id]) 

                const [getbookingp]= await conn.query(`
                    select booking_passenger_id 
                    from Booking_Passenger
                    where booking_id = ?
                    `,[current.booking_id]); 

                if(getbookingp.length === 0){
                    await conn.rollback(); 
                    return res.status(400).json({
                        message:"Booking Passenger not found"
                    });
                }

                
                const perTicket = Math.round(Number(current.amount) / getbookingp.length * 100) / 100;

                for(const bp of getbookingp){
                    
                    const ticketNum = crypto.randomUUID().replace(/-/g,"").slice(0,16).toUpperCase();

                
                    const [generateTicket] = await conn.query(`
                        INSERT INTO Ticket ( ticket_number, booking_passenger_id, schedule_id,
                         fare_amount, tax_amount)
                        values(?,?,?,?,?)`,[ticketNum,bp.booking_passenger_id,current.schedule_id,perTicket,0]);

                    
                    await conn.query(`
                        update Seat_Reservation
                        set ticket_id = ?
                        where booking_passenger_id = ?
                          and schedule_id = ?
                          and reservation_status = 'Reserved'
                          and ticket_id is null
                        `,[generateTicket.insertId,bp.booking_passenger_id,current.schedule_id]);
                }

                    await conn.commit();

                    try{ 
                        await client.set(
    `payment:${payment_id}`,
    JSON.stringify({
        payment_id: payment_id,
        booking_id: current.booking_id,
        amount: current.amount,
        payment_method: current.payment_method,
        payment_status: "Success"
    }),
    "EX",
    600
);
                
                const expirebooking =  await bookingqueue.getJob(`expire-${current.booking_id}`);

                
                if(expirebooking && await expirebooking.getState() === "delayed"){
                    await expirebooking.remove();
                }
                    }catch(postErr){
                        console.log("Post-payment cleanup error",postErr);
                    }

                // FIX: success path never sent a response
                return res.json({
                    success:true,
                    message:"Payment successful, booking confirmed",
                    booking_id: current.booking_id,
                    payment_status:"Success"
                });
            }

            
            await conn.rollback();
            return res.status(400).json({
                success:false,
                message:"Unsupported payment result"
            });
        }catch(err){
             await conn.rollback();
             console.error(err); 
              return res.status(500).json({
                success:false,
                message:"Error"
              })
        }finally{
            conn.release();
        }
        

}


module.exports = { Initiatepayment, passPayment };
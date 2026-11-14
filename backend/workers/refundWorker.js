const pool = require("../config/pool");
const { Worker } = require("bullmq");

const {refundQueue} = require("../controllers/cancellation");

const refundWorker =  new Worker("refundQueue",
    async(job)=>{
        const refund_id = job.data.refund_id;

         const conn = await pool.getConnection();

         try{

            const [refund] = await conn.query(`
                select cancellation_id,
                refund_status,
                amount
                from Refund
                where refund_id = ?
                `,[refund_id]); // FIX: await

                if(refund.length === 0){
                    throw new Error("Refund not found");
                }
                 
                const current = refund[0];
                
                if(current.refund_status === "Completed"){
                    return;
                }
                // FIX: was "||", which is always true, so every refund returned here without being processed
                if(current.refund_status !== "Requested" && current.refund_status !== "Processing"){
                    return;
                }

                // FIX: await; use refund_id (current.refund_id was never selected); set processed_at; only update if still open
                const [result] = await conn.query(`
                    update Refund
                    set refund_status = "Completed", processed_at = NOW()
                    where refund_id = ?
                    and refund_status in ('Requested','Processing')`,[refund_id]);

                    if(result.affectedRows === 0){
                        return;
                    }

                    console.log(`Refund ${refund_id} processed successfully`);

                    

         }catch(err){
            await conn.rollback();
            throw err;

         }finally{
            conn.release();
         }
    },
      { 
    connection: {
      host: "127.0.0.1",
      port: 6379,
    }
}
);

refundWorker.on("completed", (job) => {
    console.log(`Refund job ${job.id} completed`);
});

refundWorker.on("failed", (job, err) => {
    console.log(`Refund job ${job?.id} failed:`, err.message); // FIX: job can be undefined
});

module.exports = refundWorker;
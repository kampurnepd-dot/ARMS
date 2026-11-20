
const pool = require("../config/pool");
const client = require("../client");
const crypto = require("crypto");

const GUEST_SECRET = process.env.GUEST_SECRET || "change-this-secret";
const SESSION_SECONDS = 30 * 60;

async function lookupBooking(req, res) {
    const { booking_reference, email } = req.body ?? {};

    if (
        typeof booking_reference !== "string" || booking_reference.trim() === "" ||
        typeof email !== "string" || email.trim() === ""
    ) {
        return res.status(400).json({
            success: false,
            message: "Enter your booking reference and email"
        });
    }

    const [rows] = await pool.query(
        `select booking_id
         from Booking
         where booking_reference = ? and contact_email = ?`,
        [booking_reference.trim().toUpperCase(), email.trim()]
    );

    // same message for "wrong reference" and "wrong email" so nobody can probe for valid references
    if (rows.length === 0) {
        return res.status(404).json({
            success: false,
            message: "No booking found with those details"
        });
    }

    const guest_token = crypto.randomBytes(16).toString("hex");
    const hashedtoken = crypto.createHmac("sha256", guest_token)
        .update(GUEST_SECRET)
        .digest("hex");

    await client.set(`guest:${hashedtoken}`, String(rows[0].booking_id), "EX", SESSION_SECONDS);

    res.cookie("guest_session", guest_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_SECONDS * 1000
    });

    return res.json({ success: true });
}

module.exports = { lookupBooking };


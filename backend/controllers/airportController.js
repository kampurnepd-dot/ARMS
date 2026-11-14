
const pool = require("../config/pool");

// READ: Get all airports
async function getAirports(req, res) {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM Airport"
        );

        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch airports"
        });
    }
}


// CREATE: Add a new airport
async function createAirport(req, res) {
    try {
        const { airport_code, name, city, country } = req.body;

        const [result] = await pool.query(
            `INSERT INTO Airport
            (airport_code, name, city, country)
            VALUES (?, ?, ?, ?)`,
            [airport_code, name, city, country]
        );

        res.status(201).json({
            message: "Airport added successfully",
            airport_id: result.insertId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to add airport"
        });
    }
}

// UPDATE: Change airport details
async function updateAirport(req, res) {
    try {
        const { id } = req.params;
        const { airport_code, name, city, country } = req.body;

        const [result] = await pool.query(
            `UPDATE Airport
             SET airport_code = ?, name = ?, city = ?, country = ?
             WHERE airport_id = ?`,
            [airport_code, name, city, country, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Airport not found"
            });
        }

        res.json({
            message: "Airport updated successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to update airport"
        });
    }
}

// DELETE: Remove an airport
async function deleteAirport(req, res) {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            "DELETE FROM Airport WHERE airport_id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Airport not found"
            });
        }

        res.json({
            message: "Airport deleted successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to delete airport"
        });
    }
}

module.exports = {
    getAirports,
    createAirport,
    updateAirport,
    deleteAirport
};
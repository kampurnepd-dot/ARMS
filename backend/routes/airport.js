const { Router } = require("express");
const router = Router();

const {
    getAirports,
    createAirport,
    updateAirport,
    deleteAirport
} = require("../controllers/airportController");

// READ
router.get("/", getAirports);

// CREATE
router.post("/", createAirport);

// UPDATE
router.put("/:id", updateAirport);

// DELETE
router.delete("/:id", deleteAirport);

module.exports = router;
const { Router } = require("express");
const router = Router();

const {
    getFlights,
    createFlight,
    updateFlight,
    deleteFlight
} = require("../controllers/flightController");

// READ
router.get("/", getFlights);

// CREATE
router.post("/", createFlight);

// UPDATE
router.put("/:id", updateFlight);

// DELETE
router.delete("/:id", deleteFlight);

module.exports = router;
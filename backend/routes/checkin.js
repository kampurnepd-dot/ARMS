
const express = require("express");
const router = express.Router();

const checkinController = require("../controllers/checkin");

// Get open counters for an airport
router.get("/counters/:airportId", checkinController.getCounters);

// Check in a passenger
router.post("/", checkinController.checkIn);

// View boarding pass
router.get("/:id/boarding-pass", checkinController.getBoardingPass);

// Mark passenger as boarded
router.patch("/:id/board", checkinController.markBoarded);

module.exports = router;

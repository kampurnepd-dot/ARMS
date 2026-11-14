const { invalidateFlightCache } = require("../utils/flightCache");
const { Router } = require("express");
const router = Router();

const {
    updateFlightStatus
} = require("../controllers/flightStatusController");

router.patch("/:id/status", updateFlightStatus);

module.exports = router;
const express = require("express");
const router = express.Router();

const baggageController = require("../controllers/baggage");

// Register new baggage
router.post("/", baggageController.registerBaggage);

// View baggage details
router.get("/:id", baggageController.getBaggage);

// View baggage tracking history
router.get("/:id/history", baggageController.getBaggageHistory);

router.patch("/:id/status", baggageController.updateBaggageStatus);

module.exports = router;
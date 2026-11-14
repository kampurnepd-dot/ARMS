const { invalidateFlightCache } = require("../utils/flightCache");
const { Router } = require("express");
const router = Router();

const {
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule
} = require("../controllers/flightScheduleController");

// READ
router.get("/", getSchedules);

// CREATE
router.post("/", createSchedule);

// UPDATE
router.put("/:id", updateSchedule);

// DELETE
router.delete("/:id", deleteSchedule);

module.exports = router;
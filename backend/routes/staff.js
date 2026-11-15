const express = require("express");
const router = express.Router();

const staffController = require("../controllers/staff");

// Assign staff to a shift
router.post("/assign", staffController.assignStaff);

router.get("/assignments/:staffId", staffController.getStaffAssignments);
router.patch("/assignments/:assignmentId/status", staffController.updateAssignmentStatus);
router.get("/", staffController.getAllStaff);
router.get("/airport/:airportId", staffController.getStaffByAirport);
module.exports = router;
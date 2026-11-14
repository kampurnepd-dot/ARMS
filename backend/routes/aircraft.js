const { Router } = require("express");
const router = Router();

const {
    getAircraft,
    createAircraft,
    updateAircraft,
    deleteAircraft
} = require("../controllers/aircraftController");

// READ
router.get("/", getAircraft);

// CREATE
router.post("/", createAircraft);

// UPDATE
router.put("/:id", updateAircraft);

// DELETE
router.delete("/:id", deleteAircraft);

module.exports = router;
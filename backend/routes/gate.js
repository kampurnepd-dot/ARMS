const { Router } = require("express");
const router = Router();

const {
    getGates,
    createGate,
    updateGate,
    deleteGate
} = require("../controllers/gateController");

// READ
router.get("/", getGates);

// CREATE
router.post("/", createGate);

// UPDATE
router.put("/:id", updateGate);

// DELETE
router.delete("/:id", deleteGate);

module.exports = router;
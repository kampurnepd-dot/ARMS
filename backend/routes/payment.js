const express = require("express");
const router = express.Router();

const { Initiatepayment, passPayment } = require("../controllers/Payment");
const { initiatecancellation, passCancellation } = require("../controllers/cancellation");
const { getBookingSummary, getRefundStatus } = require("../controllers/summary");

// Express 4 does not catch errors thrown inside async handlers (for example a Redis failure),
// so this passes them to the error handler instead of leaving the request hanging
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// mounted at /payment in server.js
router.get("/summary", wrap(getBookingSummary));

router.post("/initiate", wrap(Initiatepayment));
router.post("/result", wrap(passPayment));

router.post("/cancel/initiate", wrap(initiatecancellation));
router.post("/cancel/result", wrap(passCancellation));

router.get("/refund/:cancellationId", wrap(getRefundStatus));

module.exports = router;
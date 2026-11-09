const {Router} = require("express");
const router = Router();
const {FlightSearch,listAirports,booking,seat_reserve,seat_price_avaliability} = require("../controllers/booking");


router.post("/flightsearch",FlightSearch);
router.get("/airports",listAirports);
router.post("/book",booking);
router.post("/reserve",seat_reserve);
router.get("/seat",seat_price_avaliability);

module.exports = router;

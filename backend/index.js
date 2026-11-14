
const express = require('express');
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");
const server = http.createServer(app);
const bookingRoute = require("./routes/booking");
const paymentRoute = require("./routes/payment");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const airportRoutes = require("./routes/airport");
const aircraftRoutes = require("./routes/aircraft");
const gateRoutes = require("./routes/gate");
const flightRoutes = require("./routes/flight");
const flightScheduleRoutes = require("./routes/flightSchedule");
const flightStatusRoutes = require("./routes/flightStatus");

const PORT = 1111;
app.use(cors({
    origin:"http://localhost:5173",
    credentials: true
}));

app.use(cookieParser());
app.use(express.json());      
app.use(cookieParser());




const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});


app.get('/', (req, res) => {
    res.send('Backend is running successfully!');
});
app.use('/book', bookingRoute);

app.use('/payment', paymentRoute);

app.use('/api/airports', airportRoutes);
app.use('/api/aircraft', aircraftRoutes);
app.use('/api/gates', gateRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/flight-schedules', flightScheduleRoutes);
app.use('/api/flight-status', flightStatusRoutes);


io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.on("join-flight", (scheduleId) => {
        const id = Number(scheduleId);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return;
        }

        socket.join(`flight:${id}`);

        console.log(
            `${socket.id} joined flight:${id}`
        );
    });

    socket.on("leave-flight", (scheduleId) => {
        const id = Number(scheduleId);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return;
        }

        socket.leave(`flight:${id}`);
    });

    socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id);
    });
});



app.set("io", io);

require("./workers/expiryworker");
require("./workers/refundWorker");







server.listen(PORT, () => {
    console.log(`Server is live on http://localhost:${PORT}`);
});
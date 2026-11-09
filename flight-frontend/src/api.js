import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:1111/book",
  withCredentials: true, // needed for the guest_session cookie
});

function fail(err) {
  const data = err.response?.data;
  const e = new Error(data?.message || (data?.error === "session_expired" ? "Your session expired." : "Something went wrong. Please try again."));
  e.status = err.response?.status;
  e.code = data?.error;
  throw e;
}

export async function getAirports() {
  try {
    const { data } = await api.get("/airports");
    return data.port ?? data.fly ?? [];
  } catch (err) {
    fail(err);
  }
}

export async function searchFlights({ dept_airport_code, arr_airport_code, date, passengers }) {
  try {
    const { data } = await api.post("/flightsearch", { dept_airport_code, arr_airport_code, date, passengers });
    return data.fly ?? [];
  } catch (err) {
    fail(err);
  }
}

export async function createBooking(payload) {
  try {
    const { data } = await api.post("/book", payload);
    return data;
  } catch (err) {
    fail(err);
  }
}

export async function getSeats() {
  try {
    const { data } = await api.get("/seat");
    return data.seats ?? [];
  } catch (err) {
    fail(err);
  }
}

// seatnos = [] lets the server auto-assign seats
export async function reserveSeats(seatnos) {
  try {
    const { data } = await api.post("/reserve", { seatnos });
    return data;
  } catch (err) {
    fail(err);
  }
}

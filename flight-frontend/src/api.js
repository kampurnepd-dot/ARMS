import axios from "axios";

const ORIGIN = "http://localhost:1111";
const api = axios.create({ baseURL: `${ORIGIN}/book`, withCredentials: true });
const pay = axios.create({ baseURL: `${ORIGIN}/payment`, withCredentials: true });

// While testing, the customer's cancel button also approves + completes the request
// (your backend has the approve/complete steps as separate calls).
// Set to false once approval is done by staff: the customer then only submits the request.
export const AUTO_APPROVE = true;

function fail(err) {
  const data = err.response?.data;
  const e = new Error(
    data?.message ||
      (data?.error === "session_expired" ? "Your session expired." : "Something went wrong. Please try again.")
  );
  e.status = err.response?.status;
  e.code = data?.error;
  e.data = data;
  throw e;
}

const call = async (fn) => {
  try {
    const { data } = await fn();
    return data;
  } catch (err) {
    fail(err);
  }
};

/* ---------- search + booking (/book) ---------- */
export async function getAirports() {
  const data = await call(() => api.get("/airports"));
  return data.port ?? data.fly ?? [];
}

export async function searchFlights({ dept_airport_code, arr_airport_code, date, passengers }) {
  const data = await call(() => api.post("/flightsearch", { dept_airport_code, arr_airport_code, date, passengers }));
  return data.fly ?? [];
}

export const createBooking = (payload) => call(() => api.post("/book", payload));

export async function getSeats() {
  const data = await call(() => api.get("/seat"));
  return data.seats ?? [];
}

// seatnos = [] lets the server auto-assign seats
export const reserveSeats = (seatnos) => call(() => api.post("/reserve", { seatnos }));

/* ---------- payment, summary, cancellation (/payment) ---------- */
export const lookupBooking = ({ booking_reference, email }) =>
  call(() => pay.post("/lookup", { booking_reference, email }));

export const getSummary = () => call(() => pay.get("/summary"));

export const initiatePayment = ({ total_fare, paymentMethod }) =>
  call(() => pay.post("/initiate", { total_fare, paymentMethod }));

// result: "Success" | "Failed"
export const passPayment = (payment_id, result) => call(() => pay.post("/result", { payment_id, result }));

export const initiateCancellation = (ticket_id, cancellation_reason) =>
  call(() => pay.post("/cancel/initiate", { ticket_id, cancellation_reason }));

export const decideCancellation = (cancellation_id, result) =>
  call(() => pay.post("/cancel/result", { cancellation_id, result }));

export async function getRefund(cancellation_id) {
  const data = await call(() => pay.get(`/refund/${cancellation_id}`));
  return data.refund;
}

export async function cancelTicket(ticket_id, reason) {
  const init = await initiateCancellation(ticket_id, reason);
  if (!AUTO_APPROVE) return { cancellation_id: init.cancellation_id, completed: false };
  await decideCancellation(init.cancellation_id, "Approved");
  const done = await decideCancellation(init.cancellation_id, "Completed");
  return { cancellation_id: init.cancellation_id, completed: true, refund_status: done.refund_status };
}

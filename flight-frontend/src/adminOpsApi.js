import axios from "axios";

const ORIGIN = "http://localhost:1111";

// Where server.js mounts the new routers. Change these if yours are mounted elsewhere.
export const PATHS = {
  checkin: "/api/checkin",
  baggage: "/api/baggage",
  staff: "/api/staff",
};

const http = axios.create({ baseURL: ORIGIN, withCredentials: true });

async function call(fn) {
  try {
    const { data } = await fn();
    return data;
  } catch (err) {
    const res = err.response;
    if (!res) throw new Error("Can’t reach the server. Is the backend running?");
    if (res.data && typeof res.data === "object" && res.data.message) throw new Error(res.data.message);
    if (res.status === 404) throw new Error("Route not found. Check that this router is mounted in server.js.");
    throw new Error("Request failed. Please try again.");
  }
}

// airports for the dropdowns (public booking endpoint, works whatever your admin api returns)
export async function getAirportList() {
  const d = await call(() => http.get("/book/airports"));
  return d.port ?? d.fly ?? [];
}

/* ---------- check-in & boarding ---------- */
export const getCounters = (airportId) => call(() => http.get(`${PATHS.checkin}/counters/${airportId}`));
export const checkInPassenger = (body) => call(() => http.post(PATHS.checkin, body));
export const getBoardingPass = (id) => call(() => http.get(`${PATHS.checkin}/${id}/boarding-pass`));
export const markBoarded = (id) => call(() => http.patch(`${PATHS.checkin}/${id}/board`));

/* ---------- baggage ---------- */
export const registerBaggage = (body) => call(() => http.post(PATHS.baggage, body));
export const getBaggage = (id) => call(() => http.get(`${PATHS.baggage}/${id}`));
export const getBaggageHistory = (id) => call(() => http.get(`${PATHS.baggage}/${id}/history`));
export const updateBaggageStatus = (id, body) => call(() => http.patch(`${PATHS.baggage}/${id}/status`, body));

/* ---------- staff ---------- */
export const getAllStaff = () => call(() => http.get(PATHS.staff));
export const assignStaff = (body) => call(() => http.post(`${PATHS.staff}/assign`, body));
export const getStaffAssignments = (staffId) => call(() => http.get(`${PATHS.staff}/assignments/${staffId}`));
export const updateAssignmentStatus = (id, status) =>
  call(() => http.patch(`${PATHS.staff}/assignments/${id}/status`, { status }));
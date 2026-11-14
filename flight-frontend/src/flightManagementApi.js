
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:1111/api",
  withCredentials: true,
});

// Airport APIs
export const getManagedAirports = () => api.get("/airports");
export const createAirport = (data) => api.post("/airports", data);
export const updateAirport = (id, data) => api.put(`/airports/${id}`, data);
export const deleteAirport = (id) => api.delete(`/airports/${id}`);

// Aircraft APIs
export const getAircraft = () => api.get("/aircraft");
export const createAircraft = (data) => api.post("/aircraft", data);
export const updateAircraft = (id, data) => api.put(`/aircraft/${id}`, data);
export const deleteAircraft = (id) => api.delete(`/aircraft/${id}`);

// Gate APIs
export const getGates = () => api.get("/gates");
export const createGate = (data) => api.post("/gates", data);
export const updateGate = (id, data) => api.put(`/gates/${id}`, data);
export const deleteGate = (id) => api.delete(`/gates/${id}`);

// Flight APIs
export const getFlights = () => api.get("/flights");
export const createFlight = (data) => api.post("/flights", data);
export const updateFlight = (id, data) => api.put(`/flights/${id}`, data);
export const deleteFlight = (id) => api.delete(`/flights/${id}`);

// Flight Schedule APIs
export const getFlightSchedules = () => api.get("/flight-schedules");
export const createFlightSchedule = (data) => api.post("/flight-schedules", data);
export const updateFlightSchedule = (id, data) =>
  api.put(`/flight-schedules/${id}`, data);
export const deleteFlightSchedule = (id) =>
  api.delete(`/flight-schedules/${id}`);

// Flight Status API
export const updateFlightStatus = (id, data) =>
  api.patch(`/flight-status/${id}/status`, data);

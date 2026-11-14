
import AirportManagementPage from "./pages/AirportManagementPage";
import AircraftManagementPage from "./pages/AircraftManagementPage";
import GateManagementPage from "./pages/GateManagementPage";
import FlightManagementPage from "./pages/FlightManagementPage";
import FlightScheduleManagementPage from "./pages/FlightScheduleManagementPage";
import FlightStatusManagementPage from "./pages/FlightStatusManagementPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

import { Link, Route, Routes } from "react-router-dom";
import SearchPage from "./pages/SearchPage";
import ResultsPage from "./pages/ResultsPage";
import PassengersPage from "./pages/PassengersPage";
import SeatsPage from "./pages/SeatsPage";
import PaymentPage from "./pages/PaymentPage";
import BookingPage from "./pages/BookingPage";

export const BRAND = "SkyDesk";

export default function App() {
  return (
    <>
      <header className="top">
        <Link to="/" className="logo">{BRAND}</Link>

        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <Link to="/?tab=manage" className="top-link">
            Manage booking
          </Link>

          <Link to="/admin" className="top-link">
            Admin
          </Link>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/flights" element={<ResultsPage />} />
        <Route path="/passengers" element={<PassengersPage />} />
        <Route path="/seats" element={<SeatsPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/booking" element={<BookingPage />} />

        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/airports" element={<AirportManagementPage />} />
        <Route path="/admin/aircraft" element={<AircraftManagementPage />} />
        <Route path="/admin/gates" element={<GateManagementPage />} />
        <Route path="/admin/flights" element={<FlightManagementPage />} />
        <Route path="/admin/schedules" element={<FlightScheduleManagementPage />} />
        <Route path="/admin/flight-status" element={<FlightStatusManagementPage />} />

        <Route path="*" element={<SearchPage />} />
      </Routes>
    </>
  );
}

import { Link, Route, Routes } from "react-router-dom";
import SearchPage from "./pages/SearchPage";
import ResultsPage from "./pages/ResultsPage";
import PassengersPage from "./pages/PassengersPage";
import SeatsPage from "./pages/SeatsPage";
import PaymentPage from "./pages/PaymentPage";
import BookingPage from "./pages/BookingPage";

export const BRAND = "SkyDesk"; // placeholder: rename to your platform name

export default function App() {
  return (
    <>
      <header className="top">
        <Link to="/" className="logo">{BRAND}</Link>
        <Link to="/?tab=manage" className="top-link">Manage booking</Link>
      </header>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/flights" element={<ResultsPage />} />
        <Route path="/passengers" element={<PassengersPage />} />
        <Route path="/seats" element={<SeatsPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="*" element={<SearchPage />} />
      </Routes>
    </>
  );
}

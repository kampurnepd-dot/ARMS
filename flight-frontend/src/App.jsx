import { Link, Route, Routes } from "react-router-dom";
import SearchPage from "./pages/SearchPage";
import ResultsPage from "./pages/ResultsPage";
import PassengersPage from "./pages/PassengersPage";
import SeatsPage from "./pages/SeatsPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import Payment from "./pages/Payment";
import ManageBooking from "./pages/ManageBooking";
import RefundStatus from "./pages/RefundStatus";

export const BRAND = "SkyDesk"; // placeholder: rename to your platform name

export default function App() {
  return (
    <>
      <header className="top">
        <Link to="/" className="logo">
          {BRAND}
        </Link>
      </header>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/flights" element={<ResultsPage />} />
        <Route path="/passengers" element={<PassengersPage />} />
        <Route path="/seats" element={<SeatsPage />} />
        <Route path="/confirmation" element={<ConfirmationPage />} />
        <Route path="*" element={<SearchPage />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/manage" element={<ManageBooking />} />
        <Route path="/refund/:cancellationId" element={<RefundStatus />} />
      </Routes>
    </>
  );
}

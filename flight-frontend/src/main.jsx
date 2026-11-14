import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SearchProvider } from "./context/SearchContext";
import { BookingProvider } from "./context/BookingContext";
import { SocketProvider } from "./context/SocketContext";
import "./styles.css";
import "./booking.css";
import "./manage.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <SearchProvider>
        <BookingProvider>
          <SocketProvider>
            <App />
          </SocketProvider>
        </BookingProvider>
      </SearchProvider>
    </BrowserRouter>
  </React.StrictMode>
);

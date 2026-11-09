import { createContext, useContext, useEffect, useState } from "react";
import { getAirports } from "../api";

const SearchContext = createContext(null);
const KEY = "flight-search";

function load() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function SearchProvider({ children }) {
  // search = { from: Airport, to: Airport, date: "YYYY-MM-DD", passengers: number }
  const [search, setSearch] = useState(load);
  const [airports, setAirports] = useState([]);
  const [airportsError, setAirportsError] = useState("");

  useEffect(() => {
    try {
      if (search) sessionStorage.setItem(KEY, JSON.stringify(search));
    } catch {
      /* storage unavailable, ignore */
    }
  }, [search]);

  useEffect(() => {
    getAirports().then(setAirports).catch((e) => setAirportsError(e.message));
  }, []);

  return (
    <SearchContext.Provider value={{ search, setSearch, airports, airportsError }}>
      {children}
    </SearchContext.Provider>
  );
}

export const useSearch = () => useContext(SearchContext);

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const Ctx = createContext(null);
const KEY = "flight-booking";
const empty = { selection: null, contact: null, passengers: [], booking: null, seats: null };

function load() {
  try {
    return { ...empty, ...JSON.parse(sessionStorage.getItem(KEY)) };
  } catch {
    return empty;
  }
}

export function BookingProvider({ children }) {
  // selection = { flight, cabin, price }, booking = { reference, total, expiresAt },
  // seats = response of POST /reserve
  const [state, setState] = useState(load);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const patch = useCallback((p) => setState((s) => ({ ...s, ...p })), []);
  const reset = useCallback(() => setState(empty), []);

  return <Ctx.Provider value={{ ...state, patch, reset }}>{children}</Ctx.Provider>;
}

export const useBooking = () => useContext(Ctx);

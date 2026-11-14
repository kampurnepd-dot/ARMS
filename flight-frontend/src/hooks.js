import { useEffect, useState } from "react";

export function useCountdown(expiresAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return expiresAt ? Math.max(0, Math.round((expiresAt - now) / 1000)) : 0;
}

export const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

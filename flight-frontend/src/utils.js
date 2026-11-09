export const toISODate = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const parseISODate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (iso, n) => {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
};

export const fmtTime = (v) =>
  new Date(v).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

export const fmtLongDate = (v) =>
  new Date(v).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

export const fmtDay = (iso) =>
  parseISODate(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export const fmtShortDate = (iso) =>
  parseISODate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export const fmtPrice = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const minutesBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);

export const fmtDuration = (mins) => `${String(Math.floor(mins / 60)).padStart(2, "0")}h ${String(mins % 60).padStart(2, "0")}m`;

// Backend returns one row per (schedule, cabin). Fold them into one card per schedule.
export function groupBySchedule(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.schedule_id)) {
      map.set(r.schedule_id, {
        schedule_id: r.schedule_id,
        flight_id: r.flight_id,
        airline_name: r.airline_name,
        aircraft_id: r.aircraft_id,
        departure_time: r.departure_time,
        arrival_time: r.arrival_time,
        cabins: {},
      });
    }
    map.get(r.schedule_id).cabins[r.cabin_class] = {
      price: Number(r.base_price),
      seats: Number(r.seats_available),
    };
  }
  return [...map.values()];
}

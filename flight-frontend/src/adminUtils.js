export const fmtDateTime = (v) =>
  v ? new Date(v).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

// <input type="datetime-local"> gives "2026-11-16T09:00", MySQL wants "2026-11-16 09:00:00"
export const toSqlDateTime = (v) => (v ? v.replace("T", " ") + ":00" : "");

export const randomTag = () => "BG" + Math.random().toString(16).slice(2, 10).toUpperCase().padEnd(8, "0");

export const isId = (v) => Number.isInteger(Number(v)) && Number(v) > 0;

// Which seat rows belong to which cabin, as [firstRow, lastRow] (inclusive).
// The server's /seat response has no cabin information, so the seat map uses this
// to show only the rows of the cabin the passenger booked.
// Make it match your Seat table (the sample data: row 1 = Business, rows 2-4 = Economy).
// A cabin that is not listed here is not filtered.
export const CABIN_ROWS = {
  Business: [1, 1],
  Economy: [2, 10],
  // Premium: [5, 8],
  // First: [1, 1],
};

export const rowRange = (cabin) => CABIN_ROWS[cabin] ?? null;

// Which cabin a seat number like "12A" belongs to (needed to update the seat counts live).
export function cabinOfSeat(seatNumber) {
  const m = /^(\d+)/.exec(String(seatNumber));
  if (!m) return null;
  const row = Number(m[1]);
  const hit = Object.entries(CABIN_ROWS).find(([, [a, b]]) => row >= a && row <= b);
  return hit ? hit[0] : null;
}

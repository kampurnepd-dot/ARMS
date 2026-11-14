export const MOCK_GATEWAY = true;      // test-mode gateway buttons on the payment page (your backend takes "result" from the client)
export const AUTO_APPROVE = true;      // cancel = initiate -> Approved -> Completed in one click
export const CANCEL_CUTOFF_HOURS = 3;  // same rule as the backend

export const formatINR = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export const hoursUntil = (d) => (new Date(d).getTime() - Date.now()) / 36e5;

export const ticketAmount = (t) => Number(t.fare_amount || 0) + Number(t.tax_amount || 0);

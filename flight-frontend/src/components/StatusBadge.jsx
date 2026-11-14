const TONE = {
  Issued: "ok", Confirmed: "ok", Success: "ok", Completed: "ok",
  Pending: "warn", Requested: "warn", Processing: "warn",
  Cancelled: "bad", Failed: "bad", Rejected: "bad", Expired: "bad",
};

export default function StatusBadge({ status }) {
  return <span className={`pm-badge ${TONE[status] || ""}`}>{status}</span>;
}

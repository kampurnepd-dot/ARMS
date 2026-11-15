export default function AdminNotice({ success, error }) {
  if (!success && !error) return null;
  return (
    <p className={error ? "admin-error" : "admin-success"} role={error ? "alert" : "status"}>
      {error || success}
    </p>
  );
}
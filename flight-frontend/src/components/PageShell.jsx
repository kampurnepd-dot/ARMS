import "../payment.css";

export default function PageShell({ title, subtitle, children }) {
  return (
    <main className="pm-page">
      <h1>{title}</h1>
      {subtitle && <p className="pm-lead">{subtitle}</p>}
      {children}
    </main>
  );
}

export function LoadError({ message, onHome }) {
  return (
    <section className="pm-card">
      <h2 className="pm-h2" style={{ marginTop: 0 }}>We couldn’t load your booking</h2>
      <p className="pm-sub">{message} Please search again to start a new booking.</p>
      <button className="pm-btn" onClick={onHome}>Search flights</button>
    </section>
  );
}

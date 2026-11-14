import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBookingSummary, initiatePayment, completePayment } from "../paymentApi";
import { MOCK_GATEWAY, formatINR } from "../paymentUtils";
import PageShell, { LoadError } from "../components/PageShell";
import TripBar from "../components/TripBar";
import PaymentMethods from "../components/PaymentMethods";

export default function Payment() {
  const nav = useNavigate();
  const [data, setData] = useState(null);        // { booking, passengers }
  const [method, setMethod] = useState("UPI");
  const [step, setStep] = useState("review");    // review | gateway | success | failed
  const [payment, setPayment] = useState(null);  // { payment_id, transaction_reference }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getBookingSummary().then(setData).catch((e) => setError(e.message));
  }, []);

  if (!data) {
    return (
      <PageShell title="Complete your payment.">
        {error ? <LoadError message={error} onHome={() => nav("/")} /> : <p className="pm-sub">Loading your booking…</p>}
      </PageShell>
    );
  }

  const { booking, passengers } = data;
  const total = Number(booking.total_amount);

  async function startPayment() {
    if (busy) return;                 // blocks double clicks, so no duplicate payment
    setBusy(true);
    setError("");
    try {
      setPayment(await initiatePayment(total, method));
      setStep("gateway");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function finish(result) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await completePayment(payment.payment_id, result);
      if (result === "Success") {
        try { setData(await getBookingSummary()); } catch { /* tickets will show on the manage page */ }
        setStep("success");
      } else {
        setStep("failed");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const title = step === "success" ? "You’re booked." : step === "failed" ? "Payment failed." : "Complete your payment.";
  const subtitle =
    step === "success" ? "Your tickets are confirmed. Keep your PNR handy." :
    step === "failed" ? "No money was taken. Your seats are held for a few more minutes." :
    "Choose how you’d like to pay. Your seats are held while you complete payment.";

  return (
    <PageShell title={title} subtitle={subtitle}>
      <section className="pm-card">
        {step === "review" && (
          <>
            <TripBar booking={booking} count={passengers.length} />
            <h2 className="pm-h2">Passengers</h2>
            {passengers.map((p) => (
              <div className="pm-ticket" key={p.passenger_name + p.seat_number}>
                <strong>{p.passenger_name}</strong>
                <span className="pm-sub">Seat {p.seat_number || "assigned at check-in"}</span>
              </div>
            ))}
            <h2 className="pm-h2">Choose how to pay</h2>
            <PaymentMethods value={method} onChange={setMethod} disabled={busy} />
            {error && <p className="pm-error">{error}</p>}
            <div className="pm-foot">
              <div>
                <span className="pm-label">Total payable</span>
                <strong className="pm-total">{formatINR(total)}</strong>
              </div>
              <button className="pm-btn" disabled={busy} onClick={startPayment}>
                {busy ? "Please wait…" : `Pay ${formatINR(total)}`}
              </button>
            </div>
          </>
        )}

        {step === "gateway" && (
          <div className="pm-gateway">
            <h2 className="pm-h2" style={{ marginTop: 0 }}>Secure payment ({method})</h2>
            <p className="pm-sub">Reference {payment.transaction_reference}</p>
            <strong className="pm-total">{formatINR(total)}</strong>
            {error && <p className="pm-error">{error}</p>}
            {MOCK_GATEWAY ? (
              <div className="pm-actions" style={{ justifyContent: "center" }}>
                <button className="pm-btn" disabled={busy} onClick={() => finish("Success")}>
                  {busy ? "Processing…" : "Pay now (test)"}
                </button>
                <button className="pm-btn danger" disabled={busy} onClick={() => finish("Failed")}>Fail payment (test)</button>
              </div>
            ) : (
              <p className="pm-sub">Waiting for your bank to confirm the payment…</p>
            )}
          </div>
        )}

        {step === "success" && (
          <>
            <span className="pm-label">Your PNR</span>
            <div className="pm-pnr">{booking.booking_reference}</div>
            <TripBar booking={booking} count={passengers.length} />
            <h2 className="pm-h2">Tickets</h2>
            {passengers.map((p) => (
              <div className="pm-ticket" key={p.passenger_name + p.seat_number}>
                <div>
                  <strong>{p.passenger_name}</strong>
                  <div className="pm-sub">Seat {p.seat_number || "—"} · {p.ticket_number || "Ticket being issued"}</div>
                </div>
                <strong>{formatINR(p.fare_amount ? Number(p.fare_amount) + Number(p.tax_amount || 0) : 0)}</strong>
              </div>
            ))}
            <div className="pm-actions">
              <button className="pm-btn" onClick={() => nav("/manage")}>Manage booking</button>
              
              <button className="pm-btn ghost" onClick={() => nav("/")}>Back to home</button>

            </div>
          </>
        )}

        {step === "failed" && (
          <>
            <p className="pm-sub">Your bank didn’t complete the payment. You can try again with the same or a different method.</p>
            <div className="pm-actions">
              <button className="pm-btn" onClick={() => { setError(""); setStep("review"); }}>Try again</button>
              <button className="pm-btn ghost" onClick={() => nav("/")}>Back to home</button>
            </div>
          </>
        )}
      </section>
    </PageShell>
  );
}

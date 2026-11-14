import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useBooking } from "../context/BookingContext";
import { getSummary, initiatePayment, passPayment } from "../api";
import { mmss, useCountdown } from "../hooks";
import TripCard from "../components/TripCard";
import FareBar from "../components/FareBar";
import { fmtPrice } from "../utils";

const METHODS = [
  { value: "UPI", title: "UPI", sub: "Pay with any UPI app" },
  { value: "Credit Card", title: "Credit card", sub: "Visa, Mastercard, Rupay, Amex & more" },
  { value: "Debit Card", title: "Debit card", sub: "All major banks" },
  { value: "Net Banking", title: "Net banking", sub: "All major banks available" },
  { value: "Wallet", title: "Pay with wallet", sub: "Popular wallets available" },
];

export default function PaymentPage() {
  const navigate = useNavigate();
  const { booking: held } = useBooking();
  const left = useCountdown(held?.expiresAt);

  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | done | error | expired
  const [error, setError] = useState("");
  const [method, setMethod] = useState("UPI");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gateway, setGateway] = useState(null); // payment_id while the test gateway is open
  const [gwError, setGwError] = useState("");

  useEffect(() => {
    getSummary()
      .then((d) => {
        const s = d.booking.booking_status;
        if (s === "Confirmed") return navigate("/booking", { replace: true });
        if (s !== "Pending") {
          setError(`This booking is ${s.toLowerCase()} and can’t be paid.`);
          return setStatus("error");
        }
        setData(d);
        setStatus("done");
      })
      .catch((e) => {
        if (e.code === "session_expired") return setStatus("expired");
        setError(e.message);
        setStatus("error");
      });
  }, [navigate]);

  const timedOut = held?.expiresAt && left === 0;

  if (status === "loading") return <main className="page"><div className="skeleton" style={{ height: 320 }} /></main>;

  if (status === "expired" || timedOut) {
    return (
      <main className="page">
        <div className="notice">
          <h3>Your session has expired</h3>
          <p>Seats are held for 10 minutes. Search again to start a new booking, or open an existing booking from the home page.</p>
          <Link className="primary link-btn" to="/">Back to home</Link>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="page">
        <div className="notice">
          <h3>We couldn’t open the payment page</h3>
          <p>{error}</p>
          <Link className="primary link-btn" to="/">Back to home</Link>
        </div>
      </main>
    );
  }

  const total = Number(data.booking.total_amount);

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      let id;
      try {
        id = (await initiatePayment({ total_fare: total, paymentMethod: method })).payment_id;
      } catch (e) {
        // a pending payment already exists for this booking: continue with it
        if (e.status === 409 && e.data?.payment_id) id = e.data.payment_id;
        else throw e;
      }
      setGwError("");
      setGateway(id);
    } catch (e) {
      if (e.code === "session_expired") setStatus("expired");
      else setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const finish = async (result) => {
    setBusy(true);
    setGwError("");
    try {
      await passPayment(gateway, result);
      if (result === "Success") navigate("/booking", { state: { paid: true } });
      else {
        setGateway(null);
        setError("Payment failed. Please try again.");
      }
    } catch (e) {
      setGwError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page checkout">
      <div className="checkout-main">
        <div className="seat-head">
          <h1>Payment</h1>
          {held?.expiresAt && <span className={left <= 60 ? "hold warn" : "hold"} role="timer">Session expires in {mmss(left)}</span>}
        </div>

        <section className="form-card">
          <h2>Choose how to pay</h2>
          <div className="methods" role="radiogroup" aria-label="Payment method">
            {METHODS.map((m) => (
              <label key={m.value} className={method === m.value ? "method on" : "method"}>
                <input type="radio" name="method" checked={method === m.value} onChange={() => setMethod(m.value)} />
                <span><strong>{m.title}</strong><small>{m.sub}</small></span>
              </label>
            ))}
          </div>
        </section>

        <label className="agree">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          I have read and understood all of the fare restrictions and agree to the terms and conditions.
        </label>

        {error && <p className="error banner" role="alert">{error}</p>}
      </div>

      <aside>
        <TripCard booking={data.booking} />
        <div className="summary-card total-card">
          <span>Total fare</span>
          <strong>{fmtPrice(total)}</strong>
        </div>
      </aside>

      <FareBar total={total}>
        <button className="primary" disabled={!agree || busy} onClick={start}>
          {busy && !gateway ? "Please wait…" : "Pay"}
        </button>
      </FareBar>

      {gateway && (
        <div className="backdrop">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="gw-title">
            <span className="tag">Test payment gateway</span>
            <h2 id="gw-title" style={{ marginTop: 12 }}>{fmtPrice(total)}</h2>
            <p className="muted">Paying with {method}. No real money is charged. Choose the outcome to simulate.</p>
            {gwError && <p className="error banner" role="alert">{gwError}</p>}
            <button className="primary wide" disabled={busy} onClick={() => finish("Success")}>
              {busy ? "Processing…" : "Complete payment (success)"}
            </button>
            <button className="danger wide" disabled={busy} onClick={() => finish("Failed")}>Fail the payment</button>
            <button className="ghost wide" disabled={busy} onClick={() => setGateway(null)}>Close and choose another method</button>
          </div>
        </div>
      )}
    </main>
  );
}

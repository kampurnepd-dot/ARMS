import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSearch } from "../context/SearchContext";
import { useBooking } from "../context/BookingContext";
import { createBooking } from "../api";
import FlightSummary from "../components/FlightSummary";
import FareBar from "../components/FareBar";
import { toISODate } from "../utils";

const blank = () => ({ type: "Adult", first: "", last: "", dob: "", passport: "" });

function Field({ label, error, children }) {
  return (
    <label className="ff">
      <span>{label}</span>
      {children}
      {error && <em>{error}</em>}
    </label>
  );
}

export default function PassengersPage() {
  const { search } = useSearch();
  const ctx = useBooking();
  const { selection, patch } = ctx;
  const navigate = useNavigate();
  const today = toISODate(new Date());
  const count = search?.passengers ?? 0;

  const [contact, setContact] = useState(ctx.contact ?? { email: "", phone: "" });
  const [forms, setForms] = useState(() => Array.from({ length: count }, (_, i) => ctx.passengers[i] ?? blank()));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState("");

  if (!search || !selection) return <Navigate to="/" replace />;

  const setP = (i, key, val) => setForms((f) => f.map((p, idx) => (idx === i ? { ...p, [key]: val } : p)));

  const validate = () => {
    const e = {};
    if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) e.email = "Enter a valid email address";
    if (!/^\d{7,15}$/.test(contact.phone.trim())) e.phone = "Enter 7–15 digits";
    forms.forEach((p, i) => {
      if (!p.first.trim()) e[`${i}.first`] = "Required";
      if (!p.last.trim()) e[`${i}.last`] = "Required";
      if (p.dob && p.dob > today) e[`${i}.dob`] = "Date can’t be in the future";
    });
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    setApiError("");
    try {
      const res = await createBooking({
        email: contact.email.trim(),
        phoneno: contact.phone.trim(),
        schedule_id: selection.flight.schedule_id,
        cabin_class: selection.cabin,
        passengers: forms.map((p) => ({
          name: `${p.first.trim()} ${p.last.trim()}`,
          email: contact.email.trim(),
          phone: contact.phone.trim(),
          passportno: p.passport.trim() || null,
          dateofbirth: p.dob || null,
          status: p.type,
        })),
      });
      patch({
        contact,
        passengers: forms,
        seats: null,
        booking: {
          reference: res.booking_reference,
          total: Number(res.total_amount),
          expiresAt: Date.now() + (res.expires_in ?? 600) * 1000,
        },
      });
      navigate("/seats");
    } catch (err) {
      setApiError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page checkout">
      <form id="passenger-form" className="checkout-main" onSubmit={submit} noValidate>
        <h1>Enter customer details</h1>

        <section className="form-card">
          <h2>Contact details</h2>
          <div className="grid2">
            <Field label="Email" error={errors.email}>
              <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} autoComplete="email" />
            </Field>
            <Field label="Mobile number" error={errors.phone}>
              <input inputMode="numeric" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value.replace(/\D/g, "") })} autoComplete="tel" />
            </Field>
          </div>
        </section>

        {forms.map((p, i) => (
          <section className="form-card" key={i}>
            <h2>Passenger {i + 1}</h2>
            <div className="type-row" role="radiogroup" aria-label={`Passenger ${i + 1} type`}>
              {["Adult", "Child", "Infant"].map((t) => (
                <label key={t} className={p.type === t ? "radio on" : "radio"}>
                  <input type="radio" name={`type-${i}`} checked={p.type === t} onChange={() => setP(i, "type", t)} />
                  {t}
                </label>
              ))}
            </div>
            <p className="note">Enter your name exactly as it appears on your government-issued ID or passport.</p>
            <div className="grid2">
              <Field label="First and middle name" error={errors[`${i}.first`]}>
                <input value={p.first} onChange={(e) => setP(i, "first", e.target.value)} autoComplete="given-name" />
              </Field>
              <Field label="Last name" error={errors[`${i}.last`]}>
                <input value={p.last} onChange={(e) => setP(i, "last", e.target.value)} autoComplete="family-name" />
              </Field>
              <Field label="Date of birth (optional)" error={errors[`${i}.dob`]}>
                <input type="date" max={today} value={p.dob} onChange={(e) => setP(i, "dob", e.target.value)} />
              </Field>
              <Field label="Passport number (optional)">
                <input value={p.passport} onChange={(e) => setP(i, "passport", e.target.value.toUpperCase())} />
              </Field>
            </div>
          </section>
        ))}

        {apiError && <p className="error banner" role="alert">{apiError}</p>}
      </form>

      <aside>
        <FlightSummary search={search} flight={selection.flight} cabin={selection.cabin} pax={count} />
      </aside>

      <FareBar total={selection.price * count}>
        <button type="button" className="ghost" onClick={() => navigate("/flights")}>Back</button>
        <button type="submit" form="passenger-form" className="primary" disabled={busy}>
          {busy ? "Saving…" : "Next"}
        </button>
      </FareBar>
    </main>
  );
}

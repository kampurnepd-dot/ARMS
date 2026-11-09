import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSearch } from "../context/SearchContext";
import AirportInput from "../components/AirportInput";
import { toISODate } from "../utils";

export default function SearchPage() {
  const { search, setSearch, airports, airportsError } = useSearch();
  const navigate = useNavigate();
  const today = toISODate(new Date());

  const [from, setFrom] = useState(search?.from ?? null);
  const [to, setTo] = useState(search?.to ?? null);
  const [date, setDate] = useState(search?.date >= today ? search.date : today);
  const [passengers, setPassengers] = useState(search?.passengers ?? 1);

  const valid = from && to && from.airport_id !== to.airport_id && date >= today && passengers >= 1;

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    setSearch({ from, to, date, passengers });
    navigate("/flights");
  };

  return (
    <main className="page">
      <section className="hero">
        <h1>Find your flight.</h1>
        <p>Compare fares across every airline and book in a few taps.</p>
      </section>

      <form className="search-card" onSubmit={submit}>
        <div className="search-row">
          <AirportInput label="From" placeholder="Leaving from?" value={from} onChange={setFrom} airports={airports} excludeCode={to?.airport_code} />
          <button type="button" className="swap" onClick={swap} aria-label="Swap airports">⇄</button>
          <AirportInput label="To" placeholder="Going to?" value={to} onChange={setTo} airports={airports} excludeCode={from?.airport_code} />

          <div className="field">
            <label htmlFor="date">Departure</label>
            <input id="date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            <span className="sub">
              {date ? new Date(date + "T00:00").toLocaleDateString("en-GB", { weekday: "long" }) : ""}
            </span>
          </div>

          <div className="field">
            <label>Travellers</label>
            <div className="stepper">
              <button type="button" onClick={() => setPassengers((p) => Math.max(1, p - 1))} aria-label="Fewer passengers">−</button>
              <strong>{passengers}</strong>
              <button type="button" onClick={() => setPassengers((p) => Math.min(9, p + 1))} aria-label="More passengers">+</button>
            </div>
            <span className="sub">{passengers === 1 ? "1 Passenger" : `${passengers} Passengers`}</span>
          </div>
        </div>

        {airportsError && <p className="error">Couldn’t load airports: {airportsError}</p>}

        <div className="search-actions">
          <button className="primary" disabled={!valid}>Search flights</button>
        </div>
      </form>
    </main>
  );
}

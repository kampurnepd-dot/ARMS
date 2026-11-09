import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSearch } from "../context/SearchContext";
import { useBooking } from "../context/BookingContext";
import { searchFlights } from "../api";
import FareModal from "../components/FareModal";
import {
  addDays, fmtDay, fmtDuration, fmtLongDate, fmtPrice, fmtShortDate,
  fmtTime, groupBySchedule, minutesBetween, toISODate,
} from "../utils";

const lowest = (f) => Math.min(...Object.values(f.cabins).map((c) => c.price));

export default function ResultsPage() {
  const { search, setSearch } = useSearch();
  const { patch } = useBooking();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | done | error
  const [error, setError] = useState("");
  const [sort, setSort] = useState("price");
  const [picked, setPicked] = useState(null); // { flight, cabin }

  useEffect(() => {
    if (!search) return;
    let cancelled = false;
    setStatus("loading");
    searchFlights({
      dept_airport_code: search.from.airport_code,
      arr_airport_code: search.to.airport_code,
      date: search.date,
      passengers: search.passengers,
    })
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setStatus("done");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [search]);

  const flights = useMemo(() => {
    const list = groupBySchedule(rows);
    const by = {
      price: (a, b) => lowest(a) - lowest(b),
      departure: (a, b) => new Date(a.departure_time) - new Date(b.departure_time),
      duration: (a, b) =>
        minutesBetween(a.departure_time, a.arrival_time) - minutesBetween(b.departure_time, b.arrival_time),
    };
    return list.sort(by[sort]);
  }, [rows, sort]);

  const cabinNames = useMemo(() => [...new Set(rows.map((r) => r.cabin_class))], [rows]);

  if (!search) return <Navigate to="/" replace />;

  const today = toISODate(new Date());
  const days = [-3, -2, -1, 0, 1, 2, 3].map((n) => addDays(search.date, n)).filter((d) => d >= today);
  const pax = search.passengers;

  const confirm = () => {
    const { flight, cabin } = picked;
    patch({
      selection: { flight, cabin, price: flight.cabins[cabin].price },
      booking: null,
      seats: null,
    });
    navigate("/passengers");
  };

  return (
    <main className="page results">
      <div className="summary">
        <span>{search.from.city} – {search.to.city}</span>
        <span>{fmtShortDate(search.date)}</span>
        <span>{pax} {pax === 1 ? "Passenger" : "Passengers"}</span>
        <button onClick={() => navigate("/")} aria-label="Edit search">✎</button>
      </div>

      <div className="date-strip" role="tablist">
        {days.map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={d === search.date}
            className={d === search.date ? "on" : ""}
            onClick={() => setSearch({ ...search, date: d })}
          >
            {fmtDay(d)}
          </button>
        ))}
      </div>

      <div className="route-bar">
        <span>{search.from.airport_code}</span>
        <i />
        <span>{search.to.airport_code}</span>
      </div>

      <div className="toolbar">
        <div className="chips">
          {[["price", "Low cost first"], ["departure", "Earliest departure"], ["duration", "Shortest"]].map(([k, l]) => (
            <button key={k} className={sort === k ? "chip on" : "chip"} onClick={() => setSort(k)}>{l}</button>
          ))}
        </div>
        {status === "done" && <span className="count">{flights.length} {flights.length === 1 ? "flight" : "flights"}</span>}
      </div>

      {status === "loading" && (
        <div aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}
        </div>
      )}

      {status === "error" && (
        <div className="notice">
          <h3>We couldn’t load flights</h3>
          <p>{error}</p>
          <button className="primary" onClick={() => setSearch({ ...search })}>Try again</button>
        </div>
      )}

      {status === "done" && flights.length === 0 && (
        <div className="notice">
          <h3>No flights for this day</h3>
          <p>Try another date from the strip above, or change your airports or passenger count.</p>
          <button className="primary" onClick={() => navigate("/")}>Edit search</button>
        </div>
      )}

      {status === "done" && flights.length > 0 && (
        <div className="cabin-head" style={{ "--n": cabinNames.length }}>
          <div>
            <strong>Fly your way</strong>
            <span>Select your preferred cabin &amp; seats.</span>
          </div>
          {cabinNames.map((c) => <b key={c}>{c}</b>)}
        </div>
      )}

      {status === "done" && flights.map((f) => {
        const mins = minutesBetween(f.departure_time, f.arrival_time);
        return (
          <article className="flight" key={f.schedule_id}>
            <div className="itin">
              <strong className="airline">{f.airline_name}</strong>
              <div className="legs">
                <div>
                  <time>{fmtTime(f.departure_time)}</time>
                  <span className="ap">{search.from.airport_code}</span>
                  <small className="date">{fmtLongDate(f.departure_time)}</small>
                  <small>{search.from.name}</small>
                </div>
                <div className="mid">
                  <span>{fmtDuration(mins)}</span>
                  <i />
                </div>
                <div>
                  <time>{fmtTime(f.arrival_time)}</time>
                  <span className="ap">{search.to.airport_code}</span>
                  <small className="date">{fmtLongDate(f.arrival_time)}</small>
                  <small>{search.to.name}</small>
                </div>
              </div>
            </div>

            <div className="fares">
              {cabinNames.map((name) => {
                const c = f.cabins[name];
                if (!c) return <div className="fare none" key={name}>—</div>;
                return (
                  <button className="fare" key={name} onClick={() => setPicked({ flight: f, cabin: name })}>
                    <span className="tag">{name}</span>
                    <span className="from">Starts at</span>
                    <strong>{fmtPrice(c.price)}</strong>
                    {pax > 1 && <small>{fmtPrice(c.price * pax)} for {pax}</small>}
                    {c.seats <= 5 && <small className="low">Only {c.seats} left</small>}
                  </button>
                );
              })}
            </div>
          </article>
        );
      })}

      {picked && (
        <FareModal
          flight={picked.flight}
          cabin={picked.cabin}
          search={search}
          pax={pax}
          onConfirm={confirm}
          onClose={() => setPicked(null)}
        />
      )}
    </main>
  );
}

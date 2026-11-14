import { Fragment, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSearch } from "../context/SearchContext";
import { useBooking } from "../context/BookingContext";
import { useFlightRoom, useSocket } from "../context/SocketContext";
import { getSeats, reserveSeats } from "../api";
import FlightSummary from "../components/FlightSummary";
import FareBar from "../components/FareBar";
import { fmtPrice } from "../utils";
import { mmss, useCountdown } from "../hooks";
import { rowRange } from "../config";

export default function SeatsPage() {
  const { search } = useSearch();
  const { selection, passengers, booking, patch, reset } = useBooking();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const [seats, setSeats] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | done | error | expired
  const [error, setError] = useState("");
  const [picked, setPicked] = useState({}); // passenger index -> seat_number
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const left = useCountdown(booking?.expiresAt);

  const loadSeats = () =>
    getSeats()
      .then((rows) => {
        setSeats(rows.map((r) => ({ ...r, price: Number(r.price), occupied: Boolean(Number(r.occupied)) })));
        setStatus("done");
      })
      .catch((e) => {
        if (e.code === "session_expired") return setStatus("expired");
        setError(e.message);
        setStatus("error");
      });

  useEffect(() => {
    if (booking) loadSeats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // live updates from other travellers
  useFlightRoom(selection?.flight.schedule_id, ({ seats: taken }) => {
    const nums = new Set(taken.map((s) => s.seat_number));
    setSeats((prev) => prev.map((s) => (nums.has(s.seat_number) ? { ...s, occupied: true } : s)));
    const lost = Object.values(picked).filter((n) => nums.has(n));
    if (lost.length) {
      setPicked(Object.fromEntries(Object.entries(picked).filter(([, n]) => !nums.has(n))));
      setNotice(`Seat ${lost.join(", ")} was just taken by another traveller. Please choose again.`);
    }
  });

  const plan = useMemo(() => {
    const rows = new Map();
    const letters = new Set();
    const range = rowRange(selection?.cabin);
    for (const s of seats) {
      const m = /^(\d+)([A-Za-z])$/.exec(s.seat_number);
      if (!m) continue;
      const row = Number(m[1]);
      if (range && (row < range[0] || row > range[1])) continue; // seat belongs to another cabin
      const l = m[2].toUpperCase();
      letters.add(l);
      if (!rows.has(row)) rows.set(row, {});
      rows.get(row)[l] = s;
    }
    const cols = [...letters].sort();
    return {
      cols,
      rows: [...rows.entries()].sort((a, b) => a[0] - b[0]),
      aisle: cols.length >= 4 ? Math.floor(cols.length / 2) - 1 : -1,
    };
  }, [seats, selection?.cabin]);

  if (!search || !selection || !booking) return <Navigate to="/" replace />;

  const owner = {};
  Object.entries(picked).forEach(([i, n]) => (owner[n] = Number(i)));
  const byNumber = new Map(seats.map((s) => [s.seat_number, s]));
  const seatFees = Object.values(picked).reduce((sum, n) => sum + (byNumber.get(n)?.price ?? 0), 0);
  const allPicked = passengers.every((_, i) => picked[i]);
  const expired = status === "expired" || left === 0;
  const name = (p) => `${p.first} ${p.last}`.trim();

  const toggle = (seat) => {
    if (seat.occupied || expired) return;
    setNotice("");
    if (owner[seat.seat_number] !== undefined) {
      const next = { ...picked };
      delete next[owner[seat.seat_number]];
      setPicked(next);
      setActive(owner[seat.seat_number]);
      return;
    }
    const next = { ...picked, [active]: seat.seat_number };
    setPicked(next);
    const nxt = passengers.findIndex((_, i) => !next[i]);
    if (nxt !== -1) setActive(nxt);
  };

  // "Skip" = auto-assign. The server would take the lowest seat ids on the aircraft (any cabin),
  // so choose the seats here: free seats first, only from the booked cabin.
  const autoPick = () => {
    const range = rowRange(selection.cabin);
    const order = (n) => {
      const m = /^(\d+)([A-Za-z])$/.exec(n);
      return m ? Number(m[1]) * 100 + m[2].toUpperCase().charCodeAt(0) : 1e9;
    };
    const free = seats
      .filter((x) => {
        const m = /^(\d+)/.exec(x.seat_number);
        return !x.occupied && m && (!range || (Number(m[1]) >= range[0] && Number(m[1]) <= range[1]));
      })
      .sort((a, b) => a.price - b.price || order(a.seat_number) - order(b.seat_number))
      .slice(0, passengers.length);
    if (free.length < passengers.length) {
      setNotice("There aren’t enough free seats left in this cabin for everyone.");
      return;
    }
    submit(free.map((x) => x.seat_number));
  };

  const submit = async (seatnos) => {
    setSaving(true);
    setNotice("");
    try {
      const res = await reserveSeats(seatnos);
      const assigned = Array.isArray(res?.seats) && res.seats.length
        ? res.seats
        : seatnos.map((n) => ({ seat_number: n }));
      patch({ seats: { seats: assigned, total_amount: res?.total_amount ?? booking.total + seatFees } });
      navigate("/payment");
    } catch (e) {
      if (e.code === "session_expired") setStatus("expired");
      else {
        setNotice(e.message);
        setPicked({});
        loadSeats();
      }
    } finally {
      setSaving(false);
    }
  };

  const startOver = () => {
    reset();
    navigate("/");
  };

  return (
    <main className="page checkout">
      <div className="checkout-main">
        <div className="seat-head">
          <h1>Choose your seats</h1>
          <span className={left <= 60 ? "hold warn" : "hold"} role="timer">Held for {mmss(left)}</span>
        </div>
        <p className="muted">
          {search.from.airport_code} → {search.to.airport_code} · {selection.cabin}
          {!connected && " · reconnecting for live seat updates…"}
        </p>

        {expired && (
          <div className="notice">
            <h3>Your booking hold has expired</h3>
            <p>Seats are held for 10 minutes. Please search again to start a new booking.</p>
            <button className="primary" onClick={startOver}>Start over</button>
          </div>
        )}

        {!expired && notice && <p className="error banner" role="alert">{notice}</p>}

        {!expired && (
          <>
            <div className="pax-tabs">
              {passengers.map((p, i) => (
                <button key={i} className={active === i ? "pax-tab on" : "pax-tab"} onClick={() => setActive(i)}>
                  <small>Passenger {i + 1}</small>
                  <strong>{name(p)}</strong>
                  <span>{picked[i] ? `Seat ${picked[i]} · ${byNumber.get(picked[i])?.price ? fmtPrice(byNumber.get(picked[i]).price) : "Free"}` : "Choose a seat"}</span>
                </button>
              ))}
            </div>

            <div className="legend">
              <span><i className="seat sample" /> Available</span>
              <span><i className="seat sample paid" /> Paid seat</span>
              <span><i className="seat sample sel" /> Selected</span>
              <span><i className="seat sample occ" /> Occupied</span>
            </div>

            {status === "loading" && <div className="skeleton" style={{ height: 320 }} />}
            {status === "error" && (
              <div className="notice">
                <h3>We couldn’t load the seat map</h3>
                <p>{error}</p>
                <button className="primary" onClick={loadSeats}>Try again</button>
              </div>
            )}

            {status === "done" && (
              <div className="plane" aria-label="Seat map">
                <div className="srow head">
                  <span className="rowno" />
                  {plan.cols.map((l, i) => (
                    <Fragment key={l}>
                      <span className="colno">{l}</span>
                      {i === plan.aisle && <span className="aisle" />}
                    </Fragment>
                  ))}
                </div>
                {plan.rows.map(([row, cells]) => (
                  <div className="srow" key={row}>
                    <span className="rowno">{row}</span>
                    {plan.cols.map((l, i) => {
                      const s = cells[l];
                      return (
                        <Fragment key={l}>
                          {s ? (
                            <button
                              className={
                                "seat" +
                                (s.occupied ? " occ" : "") +
                                (owner[s.seat_number] !== undefined ? " sel" : "") +
                                (s.price > 0 ? " paid" : "")
                              }
                              disabled={s.occupied}
                              aria-pressed={owner[s.seat_number] !== undefined}
                              aria-label={`Seat ${s.seat_number}, ${s.occupied ? "occupied" : s.price > 0 ? fmtPrice(s.price) : "free"}`}
                              title={s.occupied ? "Occupied" : s.price > 0 ? fmtPrice(s.price) : "Free"}
                              onClick={() => toggle(s)}
                            >
                              {s.seat_number}
                            </button>
                          ) : (
                            <span className="seat occ" aria-label={`Seat ${row}${l} unavailable`} />
                          )}
                          {i === plan.aisle && <span className="aisle" />}
                        </Fragment>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <aside>
        <FlightSummary search={search} flight={selection.flight} cabin={selection.cabin} pax={passengers.length} />
        {seatFees > 0 && <p className="fees">Seat fees: <strong>{fmtPrice(seatFees)}</strong></p>}
      </aside>

      <FareBar total={booking.total + seatFees}>
        <button className="ghost" disabled={saving || expired} onClick={autoPick}>Skip</button>
        <button
          className="primary"
          disabled={saving || expired || !allPicked}
          onClick={() => submit(passengers.map((_, i) => picked[i]))}
        >
          {saving ? "Reserving…" : "Next"}
        </button>
      </FareBar>
    </main>
  );
}

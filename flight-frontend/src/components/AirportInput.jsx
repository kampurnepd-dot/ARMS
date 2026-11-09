import { useMemo, useState } from "react";

export default function AirportInput({ label, value, onChange, airports, placeholder, excludeCode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return airports
      .filter((a) => a.airport_code !== excludeCode)
      .filter(
        (a) =>
          !q ||
          a.city.toLowerCase().includes(q) ||
          a.airport_code.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [airports, query, excludeCode]);

  const pick = (a) => {
    onChange(a);
    setOpen(false);
    setQuery("");
  };

  const shown = open ? query : value ? `${value.city}, ${value.airport_code}` : "";

  return (
    <div className="field airport-field">
      <label>{label}</label>
      <input
        value={shown}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches[0]) {
            e.preventDefault();
            pick(matches[0]);
          }
        }}
        autoComplete="off"
      />
      <span className="sub">{value ? value.name : "Search by city or airport"}</span>

      {open && (
        <ul className="menu" role="listbox">
          {matches.length === 0 && <li className="empty">No airports found</li>}
          {matches.map((a) => (
            <li
              key={a.airport_id}
              role="option"
              onMouseDown={(e) => {
                e.preventDefault();
                pick(a);
              }}
            >
              <span>
                <strong>{a.city}</strong>, {a.country}
                <small>{a.name}</small>
              </span>
              <b className="code">{a.airport_code}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

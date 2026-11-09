import { fmtPrice } from "../utils";

export default function FareBar({ total, children }) {
  return (
    <div className="farebar">
      <div className="farebar-in">
        <span className="farebar-label">TOTAL FARE</span>
        <strong>{fmtPrice(total)}</strong>
        <div className="farebar-actions">{children}</div>
      </div>
    </div>
  );
}

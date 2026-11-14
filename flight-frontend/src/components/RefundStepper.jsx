const STEPS = ["Requested", "Processing", "Completed"];

export default function RefundStepper({ status }) {
  if (status === "Rejected") return <p className="pm-error">This refund was rejected. Please contact support.</p>;
  const current = STEPS.indexOf(status);
  return (
    <ol className="pm-steps">
      {STEPS.map((step, i) => {
        const done = i < current || status === "Completed";
        return (
          <li key={step} className={done ? "done" : i === current ? "now" : ""}>
            <i>{done ? "✓" : i + 1}</i>
            {step}
          </li>
        );
      })}
    </ol>
  );
}

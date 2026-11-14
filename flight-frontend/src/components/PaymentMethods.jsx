// values must match the backend list: Credit Card, Debit Card, UPI, Net Banking, Wallet
const METHODS = [
  ["UPI", "Pay with any UPI app"],
  ["Credit Card", "Visa, Mastercard, RuPay"],
  ["Debit Card", "All major banks"],
  ["Net Banking", "Choose your bank"],
  ["Wallet", "Use your wallet balance"],
];

export default function PaymentMethods({ value, onChange, disabled }) {
  return (
    <div className="pm-methods" role="radiogroup" aria-label="Payment method">
      {METHODS.map(([method, hint]) => (
        <button
          key={method}
          type="button"
          role="radio"
          aria-checked={value === method}
          disabled={disabled}
          className={"pm-method" + (value === method ? " on" : "")}
          onClick={() => onChange(method)}
        >
          <strong>{method}</strong>
          <span className="pm-sub">{hint}</span>
        </button>
      ))}
    </div>
  );
}

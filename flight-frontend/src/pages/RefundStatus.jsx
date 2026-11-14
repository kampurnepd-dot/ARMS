import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getRefundStatus } from "../paymentApi";
import { formatDateTime, formatINR } from "../paymentUtils";
import PageShell from "../components/PageShell";
import StatusBadge from "../components/StatusBadge";
import RefundStepper from "../components/RefundStepper";

const FINAL = ["Completed", "Rejected"];

export default function RefundStatus() {
  const { cancellationId } = useParams();
  const [refund, setRefund] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let timer;
    let stopped = false;

    async function poll() {
      try {
        const { refund } = await getRefundStatus(cancellationId);
        if (stopped) return;
        setRefund(refund);
        setError("");
        if (!FINAL.includes(refund.refund_status)) timer = setTimeout(poll, 3000);   // keep checking until it is done
      } catch (e) {
        if (stopped) return;
        setError(e.status === 404 ? "No refund was created for this cancellation." : e.message);
        if (e.status !== 404) timer = setTimeout(poll, 5000);
      }
    }

    poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [cancellationId]);

  return (
    <PageShell
      title="Your refund."
      subtitle={refund ? <>Status <StatusBadge status={refund.refund_status} /></> : "Checking the latest status…"}
    >
      <section className="pm-card">
        {error && <p className="pm-error">{error}</p>}

        {refund && (
          <>
            <span className="pm-label">Refund amount</span>
            <strong className="pm-total">{formatINR(refund.amount)}</strong>
            <RefundStepper status={refund.refund_status} />
            <div className="pm-details">
              <div><span className="pm-sub">Refund reference</span><strong>{refund.refund_reference || "—"}</strong></div>
              <div><span className="pm-sub">Requested</span><strong>{formatDateTime(refund.requested_at)}</strong></div>
              <div><span className="pm-sub">Processed</span><strong>{refund.processed_at ? formatDateTime(refund.processed_at) : "In progress"}</strong></div>
              <div><span className="pm-sub">Refunded to</span><strong>Original payment method</strong></div>
            </div>
            <p className="pm-sub">Banks can take a few working days to show the money after the refund is processed.</p>
          </>
        )}

        <div className="pm-foot">
          <Link className="pm-btn ghost" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }} to="/manage">
            Back to booking
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

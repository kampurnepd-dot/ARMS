// API calls for payment, cancellation and refund.
// Set VITE_API_URL in .env (default http://localhost:1111). The backend must allow credentials in CORS,
// because the guest_session cookie is what tells it which booking this is.
//
// Responses this file expects:
//  GET  /payment/summary  -> { booking: { booking_reference, booking_status, total_amount, flight_number,
//                              from_city, from_code, to_city, to_code, departure_time },
//                              passengers: [{ passenger_name, seat_number, ticket_id, ticket_number, ticket_status,
//                                             fare_amount, tax_amount, cancellation_id }] }
//  POST /payment/initiate -> { payment_id, transaction_reference, amount, payment_status }
//  POST /payment/result   -> { success, message }
//  POST /payment/cancel/initiate | /payment/cancel/result -> your controllers' responses
//  GET  /payment/refund/:cancellationId -> { refund: { amount, refund_status, refund_reference, requested_at, processed_at } }
const API = import.meta.env.VITE_API_URL || "http://localhost:1111";

async function request(path, body, method = body ? "POST" : "GET") {
  const res = await fetch(API + path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      data.message || (data.error === "session_expired" ? "Your booking session has expired." : "Something went wrong.")
    );
    err.status = res.status;
    err.code = data.error;
    throw err;
  }
  return data;
}

export const getBookingSummary = () => request("/payment/summary");
export const initiatePayment = (total_fare, paymentMethod) => request("/payment/initiate", { total_fare, paymentMethod });
export const completePayment = (payment_id, result) => request("/payment/result", { payment_id, result });
export const initiateCancellation = (ticket_id, cancellation_reason) => request("/payment/cancel/initiate", { ticket_id, cancellation_reason });
export const passCancellation = (cancellation_id, result) => request("/payment/cancel/result", { cancellation_id, result });
export const getRefundStatus = (cancellationId) => request(`/payment/refund/${cancellationId}`);

// one click for the customer = the three backend steps
export async function cancelTicket(ticket_id, reason, autoApprove = true) {
  const { cancellation_id } = await initiateCancellation(ticket_id, reason);
  if (!autoApprove) return { cancellation_id, status: "Requested" };
  await passCancellation(cancellation_id, "Approved");
  const done = await passCancellation(cancellation_id, "Completed");
  return { cancellation_id, status: "Completed", refund_status: done.refund_status };
}
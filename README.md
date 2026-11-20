# Airline Reservation Management System (ARMS)

A Database Management Systems project: a full-stack airline reservation system with guest booking, seat selection, payment, ticketing, cancellation with refunds, flight administration and airport operations. The focus is on **MySQL transactions, row-level locking, triggers and concurrency control**, with Redis and BullMQ used around the database.

## Team

| Name | Roll No. |
|---|---|
| Saumya Roy | 250001064 |
| Shrawani Adbalwar | 250001004 |
| Chahak Dhote | 250001019 |
| Kampurne Pranjali Dhondiba | 250001037 |

## Features

**Customer**
- Search flights by route, date and passenger count (cached in Redis for 30 s)
- Book without an account: a guest session is tied to the booking
- Choose seats manually or let the system pick them (10-minute hold, then the booking expires)
- Pay with Credit Card, Debit Card, UPI, Net Banking or Wallet; tickets are issued per passenger
- View the booking summary, cancel a ticket (not within 3 hours of departure) and track refund status
- Reopen a booking with booking reference + contact email

**Admin**
- CRUD for aircraft, airports, flights, gates and flight schedules
- Change flight status with a full audit history
- Approve, reject and complete cancellation requests; refunds are created and queued automatically

**Airport operations (Module 4)**
- Passenger check-in with boarding pass generation, and boarding only while the flight is in the Boarding phase
- Baggage registration (unique tag, weight, type) and tracking: Checked-In, Screened, Loaded, In Transit, Arrived, Delivered (full history)
- Staff listing, airport-wise records, shift assignment with overlap prevention, assignment status updates
- Baggage notifications processed asynchronously with Redis + BullMQ, monitored in Bull Board

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React.js |
| Backend | Node.js, Express.js |
| Database | MySQL (InnoDB), schema `airbook` |
| Cache and sessions | Redis |
| Background jobs | BullMQ, Bull Board |
| Real-time | Socket.IO (live seat updates) |

## Architecture

```
React client  ->  Express controllers  ->  MySQL (source of truth, ACID)
                        |
                        +-> Redis    (guest sessions, search/airport/payment cache)
                        +-> BullMQ   (expire booking, refunds, baggage notifications)
                        +-> Socket.IO (seat-update events per flight)
```

Principle: **MySQL decides, Redis accelerates.** Every change to seats, money, tickets or statuses happens inside a MySQL transaction. Redis writes, queue jobs and cache invalidation run only after `COMMIT`.

## Database highlights

- **26 tables**, including `Flight_Schedule`, `Seat`, `Booking`, `Booking_Passenger`, `Seat_Reservation`, `Ticket`, `Payment`, `Cancellation`, `Refund`, `Check_In`, `Baggage`, `Staff_Assignment`, and the audit tables `Flight_Status_History`, `Transaction_Status_History` and `Gate_Change_Log`.
- **13 transactions** (booking, seat reservation, payment initiation and confirmation, cancellation request and decision, flight status, check-in, boarding, baggage registration and tracking, staff assignment and status).
- **Row locking** with `SELECT ... FOR UPDATE` on guard rows (Booking, Seat, Payment, Ticket, Flight_Schedule, Staff). Seats are locked in `seat_id` order to avoid deadlocks, and `FOR UPDATE OF b` is used in cancellation so the shared flight schedule row is not locked.
- **11 triggers**
  - Validation, `BEFORE INSERT` on `Seat_Reservation`: `chk_seat`, `check_seat_price`, `check_flight`
  - Audit, `AFTER INSERT/UPDATE`: Payment, Cancellation and Refund status history; `flight_status_history` and `gate_change_log` on `Flight_Schedule`
- **State machines** for booking, payment, ticket, cancellation, boarding, baggage and staff assignment status.

See the project report (`ARMS_DBMS_Project_Report.pdf`) for the data dictionary, lock map, concurrency scenarios and design review.

## Getting started

### Prerequisites
- Node.js 18 or later
- MySQL 8
- Redis (listening on `127.0.0.1:6379`)

### 1. Database
Create the schema and load the SQL scripts in this order: table definitions, then the triggers.

```sql
CREATE DATABASE IF NOT EXISTS airbook;
USE airbook;
-- 1. run the CREATE TABLE script(s)
-- 2. run the trigger script(s)
SHOW TRIGGERS FROM airbook;   -- should list 11 triggers
```

### 2. Backend
```bash
npm install
```
Set the database credentials in the connection pool configuration (`config/pool`) and the environment variables:

| Variable | Purpose | Default |
|---|---|---|
| `GUEST_SECRET` | Secret used to hash guest session tokens (set a long random value) | `change-this-secret` |
| `NODE_ENV` | Set to `production` to send the session cookie with `secure` | - |

```bash
node server.js          # adjust to your entry file
```
Start the BullMQ workers (booking expiry, refund, baggage notification) and open Bull Board to monitor the queues.

### 3. Frontend
```bash
cd client               # adjust to your frontend folder
npm install
npm start
```

## Main endpoints (from the controllers)

| Area | Operation |
|---|---|
| Search | Flight search, airport list |
| Booking | Create booking, reserve seats, list available seats and seat prices |
| Payment | Initiate payment, payment result callback, booking summary, booking lookup |
| Cancellation | Request cancellation, admin decision, refund status |
| Admin | CRUD for aircraft, airports, flights, gates, schedules; update flight status |
| Airport ops | Check-in, boarding pass, mark boarded, baggage register/status/history, staff assignment |

Check the route files for exact paths and HTTP methods.

## Project structure (backend)

```
controllers/   booking, payment, cancellation, summary, lookup, flights, schedules,
               airports, aircraft, gates, flight status, check-in, baggage, staff
config/        database pool
utils/         flightCache (Redis cache invalidation)
routes/        route definitions
client         Redis client
```

## Notes

- The payment result and cancellation decision endpoints, and all admin routes, should be protected by authentication in a real deployment.
- The review in section 11 of the report lists hardening items, including re-checking seat availability with a locking read and avoiding duplicate flight status history rows.

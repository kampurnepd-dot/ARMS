import { Link } from "react-router-dom";
import "../admin.css";

const sections = [
  {
    title: "Airport Management",
    description: "Add, update, view and delete airports.",
    path: "/admin/airports",
  },
  {
    title: "Aircraft Management",
    description: "Manage aircraft details and availability.",
    path: "/admin/aircraft",
  },
  {
    title: "Gate Management",
    description: "Manage airport gates and their status.",
    path: "/admin/gates",
  },
  {
    title: "Flight Management",
    description: "Manage flight numbers and airline details.",
    path: "/admin/flights",
  },
  {
    title: "Flight Schedule",
    description: "Create and manage flight schedules.",
    path: "/admin/schedules",
  },
  {
    title: "Flight Status",
    description: "Update flight status and view changes.",
    path: "/admin/flight-status",
  },
  {
    title: "Check-in & Boarding",
    description: "Check in passengers, view boarding passes and board passengers.",
    path: "/admin/check-in",
  },
  {
    title: "Baggage Management",
    description: "Register baggage, track it and update its status.",
    path: "/admin/baggage",
  },
  {
    title: "Staff Management",
    description: "View staff availability and assign shifts.",
    path: "/admin/staff",
  },
];

export default function AdminDashboardPage() {
  return (
    <main className="admin-page">
      <div className="admin-heading">
        <h1>Admin Dashboard</h1>
        <p>Manage airports, aircraft, gates, flight operations, check-in, baggage and staff.</p>
      </div>

      <div className="admin-dashboard-grid">
        {sections.map((section) => (
          <Link
            to={section.path}
            className="admin-dashboard-card"
            key={section.path}
          >
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            <span>Manage →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
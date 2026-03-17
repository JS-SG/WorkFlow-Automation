import { NavLink } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", icon: "⚡", label: "Workflows", end: true },
  { to: "/audit", icon: "📋", label: "Audit Log" },
  { to: "/notifications", icon: "🔔", label: "Notifications" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        <h1>FlowForge</h1>
        <span>Workflow Engine</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-label">Navigation</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        {user?.role !== "employee" && (
           <NavLink
             to="/approvals"
             className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
           >
             <span style={{ fontSize: 16 }}>✅</span>
             Pending Approvals
           </NavLink>
        )}
      </nav>

      {/* User Info & Footer */}
      <div className="sidebar-footer">
        <div style={{ 
          marginBottom: 16, 
          padding: "12px", 
          background: "rgba(255,255,255,0.03)", 
          borderRadius: "var(--r-md)",
          border: "1px solid var(--border)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ 
              width: 32, height: 32, borderRadius: "50%", 
              background: "var(--accent)", color: "#fff", 
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700
            }}>
              {user?.name?.[0] || "?"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "1px" }}>
                {user?.role}
              </div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="btn btn-ghost btn-sm"
            style={{ width: "100%", justifyContent: "center", fontSize: 11, color: "var(--red)" }}
          >
            Logout
          </button>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="sidebar-footer-label">v1.0 · Halleyx</span>
          <NotificationBell />
        </div>
      </div>
    </aside>
  );
}

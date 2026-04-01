import { useState } from "react";
import { NavLink } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../context/AuthContext";
import { FiZap, FiFileText, FiBell, FiCheckSquare, FiLogOut, FiMenu, FiChevronLeft, FiX } from "react-icons/fi";

const NAV_ITEMS = [
  { to: "/", icon: <FiZap size={18} />, label: "Workflows", end: true },
  { to: "/audit", icon: <FiFileText size={18} />, label: "Audit Log" },
  { to: "/notifications", icon: <FiBell size={18} />, label: "Notifications" },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${isOpen ? 'mobile-open' : ''}`} style={{
      width: collapsed ? 80 : 280,
      transition: 'width 0.2s',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-elevated)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid var(--border)',
      height: '100vh',
    }}>
      {/* Logo */}
      <div className="sidebar-logo" style={{
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '24px 0' : '24px 24px', borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sidebar-logo-icon" style={{
            width: 36, height: 36, background: 'var(--gradient)',
            borderRadius: '10px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff',
            boxShadow: '0 4px 12px rgba(99,102,241,0.25)'
          }}>
            <FiZap size={22} />
          </div>
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1, letterSpacing: '-0.5px' }}>FlowForge</span>
              <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>Enterprise</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <div style={{ display: 'flex', gap: 6 }}>
             <button className="sidebar-collapse-btn desktop-only" onClick={() => setCollapsed(true)} style={{
               background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer'
             }}>
               <FiChevronLeft size={18} />
             </button>
             <button className="mobile-close-btn" onClick={onClose} style={{
               background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'none'
             }}>
               <FiX size={20} />
             </button>
          </div>
        )}
      </div>

      {collapsed && (
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <button onClick={() => setCollapsed(false)} style={{
            background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 10
          }}>
            <FiMenu size={20} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav" style={{ padding: collapsed ? '12px 8px' : '24px 16px', flex: 1, overflowY: 'auto' }}>
        {!collapsed && <div className="sidebar-label" style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 16, paddingLeft: 8 }}>Menu</div>}
        
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: collapsed ? '12px' : '10px 14px',
              borderRadius: 'var(--r-md)', textDecoration: 'none', color: 'var(--text-2)',
              marginBottom: 4, transition: 'all 0.15s', justifyContent: collapsed ? 'center' : 'flex-start'
            }}
          >
            {item.icon}
            {!collapsed && <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>}
          </NavLink>
        ))}

        {user?.role !== "employee" && (
           <NavLink
             to="/approvals"
             className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
             style={{
               display: 'flex', alignItems: 'center', gap: 12, padding: collapsed ? '12px' : '10px 14px',
               borderRadius: 'var(--r-md)', textDecoration: 'none', color: 'var(--text-2)',
               marginBottom: 4, transition: 'all 0.15s', justifyContent: collapsed ? 'center' : 'flex-start'
             }}
           >
             <FiCheckSquare size={18} />
             {!collapsed && <span style={{ fontSize: 14, fontWeight: 500 }}>Pending Approvals</span>}
           </NavLink>
        )}
      </nav>

      {/* User Info & Footer */}
      <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border)', padding: collapsed ? '16px 8px' : '20px' }}>
        <div 
          onClick={logout}
          className="sidebar-user-card"
          style={{
            display: 'flex', alignItems: 'center', gap: 12, justifyContent: collapsed ? 'center' : 'space-between',
            background: collapsed ? 'transparent' : 'var(--bg-input)', padding: collapsed ? 0 : '12px',
            borderRadius: '12px', border: collapsed ? 'none' : '1px solid var(--border)', cursor: 'pointer',
            transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              {user?.name?.[0] || "?"}
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{user?.role}</div>
              </div>
            )}
          </div>
          {!collapsed && <FiLogOut size={16} color="var(--red)" style={{ opacity: 0.7 }} />}
        </div>
        {collapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
             <button onClick={logout} style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', display: 'flex' }}>
               <FiLogOut size={20} />
             </button>
          </div>
        )}
      </div>
    </aside>
  );
}

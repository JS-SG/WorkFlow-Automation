import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "../api/api";

const EVENT_ICONS = {
  APPROVAL_COMPLETED: "✅",
  APPROVAL_APPROVED: "✅",
  APPROVAL_REJECTED: "❌",
  NOTIFICATION_SENT: "🔔",
  TASK_COMPLETED: "⚙️",
  STEP_FAILED: "❌",
  WORKFLOW_COMPLETED: "🎉",
  WORKFLOW_FAILED: "💥",
  workflow_approval: "⏳",
};

const EVENT_COLORS = {
  APPROVAL_COMPLETED: "var(--green)",
  APPROVAL_APPROVED: "var(--green)",
  APPROVAL_REJECTED: "var(--red)",
  NOTIFICATION_SENT: "var(--blue)",
  TASK_COMPLETED: "var(--yellow)",
  STEP_FAILED: "var(--red)",
  WORKFLOW_COMPLETED: "var(--green)",
  WORKFLOW_FAILED: "var(--red)",
};

function timeAgo(iso) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications || []);
      setUnread(res.data.unread_count || 0);
    } catch {}
  }, []);

  // Poll every 4 seconds to pick up new step notifications
  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 4000);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkRead = async (id) => {
    await markNotificationRead(id);
    fetchNotifications();
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    fetchNotifications();
  };

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      {/* Bell Button */}
      <button
        className="btn btn-ghost btn-icon"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        style={{
          position: "relative",
          background: open ? "var(--bg-hover)" : "transparent",
          border: "1px solid var(--border)",
          color: "var(--text-2)",
          width: 36, height: 36,
        }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "var(--red)", color: "#fff",
            borderRadius: 99, fontSize: 9, fontWeight: 800,
            minWidth: 16, height: 16, display: "flex",
            alignItems: "center", justifyContent: "center",
            padding: "0 3px", lineHeight: 1,
            border: "2px solid var(--bg-elevated)",
          }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          width: 340,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--shadow-lg)",
          zIndex: 9000,
          overflow: "hidden",
          animation: "slideUp 0.15s ease",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px 10px",
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-1)" }}>
              Notifications
              {unread > 0 && (
                <span style={{
                  marginLeft: 6, background: "var(--red-bg)", color: "var(--red)",
                  fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99
                }}>{unread}</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {unread > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={handleMarkAll} style={{ fontSize: 11, padding: "3px 8px" }}>
                  Mark all read
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); navigate("/notifications"); }} style={{ fontSize: 11, padding: "3px 8px" }}>
                View all
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: "32px 16px", textAlign: "center",
                color: "var(--text-3)", fontSize: 13,
              }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>🔔</div>
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const isApproved = n.event_type === "APPROVAL_APPROVED" || n.event_type === "WORKFLOW_COMPLETED";
                const isRejected = n.event_type === "APPROVAL_REJECTED" || n.event_type === "WORKFLOW_FAILED" || n.event_type === "STEP_FAILED";
                const color = isApproved ? "#10b981" : isRejected ? "#ef4444" : (EVENT_COLORS[n.event_type] || "var(--text-3)");

                return (
                  <div
                    key={n.id}
                    onClick={() => { handleMarkRead(n.id); setOpen(false); navigate(`/workflow/execution/${n.execution_id}`); }}
                    style={{
                      display: "flex", gap: 10, padding: "11px 14px",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      background: n.is_read ? "transparent" : (isApproved ? "rgba(16, 185, 129, 0.05)" : isRejected ? "rgba(239, 68, 68, 0.05)" : "rgba(99,102,241,0.05)"),
                      transition: "background 0.1s",
                      position: "relative",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = n.is_read ? "transparent" : (isApproved ? "rgba(16, 185, 129, 0.05)" : isRejected ? "rgba(239, 68, 68, 0.05)" : "rgba(99,102,241,0.05)")}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: isApproved ? "rgba(16, 185, 129, 0.1)" : isRejected ? "rgba(239, 68, 68, 0.1)" : "var(--bg-hover)",
                      border: `1px solid ${isApproved ? "rgba(16, 185, 129, 0.2)" : isRejected ? "rgba(239, 68, 68, 0.2)" : "transparent"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 15,
                    }}>
                      {isApproved ? "✅" : isRejected ? "❌" : (EVENT_ICONS[n.event_type] || "📋")}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Event type label */}
                      <div style={{
                        fontSize: 10, fontWeight: 700,
                        color: color,
                        marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.3px"
                      }}>
                        {isApproved ? "Workflow Approved" : isRejected ? "Workflow Rejected" : n.event_type?.replace(/_/g, " ")}
                      </div>
                      {/* Message */}
                      <div style={{
                        fontSize: 12, color: "var(--text-1)",
                        lineHeight: 1.4,
                        overflow: "hidden", textOverflow: "ellipsis",
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical"
                      }}>
                        {n.message}
                      </div>
                      {/* Metadata row */}
                      <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                        {n.step_type && (
                          <span style={{
                            fontSize: 10, padding: "1px 5px", borderRadius: 3,
                            background: "var(--bg-hover)", color: "var(--text-3)",
                          }}>{n.step_type}</span>
                        )}
                        <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: "auto" }}>
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!n.is_read && (
                      <div style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: color, flexShrink: 0, marginTop: 4,
                      }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

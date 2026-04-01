import { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import { useNavigate } from "react-router-dom";
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from "../api/api";
import { useAuth } from "../context/AuthContext";

import { FiCheckCircle, FiXCircle, FiBell, FiSettings, FiAward, FiAlertTriangle, FiClock, FiFileText } from "react-icons/fi";

const EVENT_ICONS = {
  APPROVAL_COMPLETED: <FiCheckCircle />,
  APPROVAL_APPROVED: <FiCheckCircle />,
  APPROVAL_REJECTED: <FiXCircle />,
  NOTIFICATION_SENT: <FiBell />,
  TASK_COMPLETED: <FiSettings />,
  STEP_FAILED: <FiXCircle />,
  WORKFLOW_COMPLETED: <FiAward />,
  WORKFLOW_FAILED: <FiAlertTriangle />,
  workflow_approval: <FiClock />,
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
  return new Date(iso).toLocaleDateString();
}

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await getUserNotifications(user.id);
      setNotifications(res.data.notifications || []);
      setUnread(res.data.unread_count || 0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkRead = async (id, execId) => {
    await markNotificationRead(id);
    if (execId) navigate(`/workflow/execution/${execId}`);
    fetchNotifications();
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    fetchNotifications();
  };

  const filtered = notifications.filter(n => {
    if (filter === "unread") return !n.is_read;
    if (filter === "approval")
    return n.event_type === "APPROVAL_APPROVED";

  if (filter === "failed")
    return (
      n.event_type === "STEP_FAILED" ||
      n.event_type === "WORKFLOW_FAILED" ||
      n.event_type === "APPROVAL_REJECTED"
    );
    if (filter === "completed") return n.event_type?.includes("COMPLETED");
    return true;
  });

  const counts = notifications.reduce((a, n) => ({ ...a, [n.event_type]: (a[n.event_type] || 0) + 1 }), {});

  return (
    <Layout>
      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {[
          { icon: <FiBell />, value: notifications.length, label: "Total Notifications", color: "#3b82f6" },
          { icon: <span style={{ color: "var(--red)" }}>●</span>, value: unread, label: "Unread", color: "#f43f5e" },
          { icon: <FiCheckCircle />, value: (counts["APPROVAL_APPROVED"] || 0) + (counts["WORKFLOW_COMPLETED"] || 0), label: "Approvals / Completions", color: "#10b981" },
          { icon: <FiXCircle />, value: (counts["STEP_FAILED"] || 0) + (counts["WORKFLOW_FAILED"] || 0) + (counts["APPROVAL_REJECTED"] || 0), label: "Failures / Rejections", color: "#ef4444" }
        ].map((stat, i) => (
          <div key={i} style={{
            padding: "24px",
            background: "var(--bg-modal)",
            border: "1px solid var(--border)",
            borderTop: `2px solid ${stat.color}`,
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--shadow-sm)",
            display: "flex", flexDirection: "column", gap: "8px",
            transition: "transform 0.2s, box-shadow 0.2s",
            cursor: "default"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "var(--shadow-lg)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "var(--shadow-sm)";
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: "32px", fontWeight: 700, color: "var(--text-1)" }}>{stat.value}</span>
              <span style={{ fontSize: "24px", color: "var(--text-3)", opacity: 0.5 }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: "14px", color: "var(--text-2)", fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>
      <div className="page-header">
        <div>
          <h2>Notifications</h2>
          <p>Step-level and workflow-level events delivered to your dashboard</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {unread > 0 && (
            <button className="btn btn-secondary" onClick={handleMarkAll}>✓ Mark all read</button>
          )}
          <button className="btn btn-secondary" onClick={fetchNotifications}>🔄 Refresh</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 2 }}>
        {[
          { key: "all", label: "All" },
          { key: "unread", label: `Unread${unread > 0 ? ` (${unread})` : ""}` },
          { key: "approval", label: "Approvals" },
          { key: "failed", label: "Failures" },
        ].map(tab => (
          <button
            key={tab.key}
            className={`btn btn-ghost btn-sm`}
            onClick={() => setFilter(tab.key)}
            style={{
              fontWeight: filter === tab.key ? 700 : 400,
              color: filter === tab.key ? "var(--accent)" : "var(--text-3)",
              borderBottom: filter === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
              borderRadius: 0,
              padding: "6px 12px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div className="fullpage-loading"><div className="loading-spinner" />Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FiBell /></div>
            <h3>No notifications</h3>
            <p>Execute a workflow to see step and workflow notifications here</p>
          </div>
        ) : (
            filtered.map((n, idx) => {
              const isApproved = n.event_type === "APPROVAL_APPROVED" || (n.event_type === "WORKFLOW_COMPLETED" && !n.message?.toLowerCase().includes("reject"));
              const isRejected =
                n.event_type === "APPROVAL_REJECTED" ||
                n.event_type === "WORKFLOW_FAILED" ||
                n.event_type === "STEP_FAILED" ||
                n.message?.toLowerCase().includes("reject");
              const isInfo = n.event_type === "NOTIFICATION_SENT" || n.event_type === "TASK_COMPLETED" || n.event_type === "APPROVAL_REQUIRED" || n.event_type === "workflow_approval";
              const isTracker = n.event_type?.startsWith("TRACKER_");

              let theme = {
                color: "var(--text-3)",
                bg: "var(--bg-elevated)",
                icon: <FiFileText />,
                title: n.event_type?.replace(/_/g, " ") || "Notification",
                borderColor: "var(--border)"
              };

              if (isApproved) {
                theme = {
                  color: "#10b981",
                  bg: "rgba(16, 185, 129, 0.08)",
                  icon: <FiCheckCircle />,
                  title: "Workflow Approved",
                  borderColor: "rgba(16, 185, 129, 0.2)"
                };
              } else if (isRejected) {
                theme = {
                  color: "#ef4444",
                  bg: "rgba(239, 68, 68, 0.08)",
                  icon: <FiXCircle />,
                  title: "Workflow Rejected",
                  borderColor: "rgba(239, 68, 68, 0.2)"
                };
              } else if (isInfo) {
                 theme = {
                  color: "var(--accent)",
                  bg: "rgba(99, 102, 241, 0.08)",
                  icon: EVENT_ICONS[n.event_type] || <FiBell />,
                  title: n.event_type?.replace(/_/g, " "),
                  borderColor: "var(--accent-30)"
                };
              }

              return (
                <div
                  key={n.id}
                  onClick={() => handleMarkRead(n.id, n.execution_id)}
                  style={{
                    display: "flex", gap: 16, padding: "20px 24px",
                    borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : "none",
                    background: n.is_read ? "var(--bg-modal)" : (isApproved ? "rgba(16, 185, 129, 0.12)" : isRejected ? "rgba(239, 68, 68, 0.12)" : "rgba(99,102,241,0.12)"),
                    cursor: n.is_read ? "default" : "pointer",
                    position: "relative",
                  }}
                >
                  {!n.is_read && (
                    <div style={{
                      position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
                      background: theme.color
                    }} />
                  )}
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background: theme.bg,
                    border: `1px solid ${theme.borderColor}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}>
                    {theme.icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <h4 style={{ 
                          margin: 0, fontSize: 15, fontWeight: 700, 
                          color: isApproved || isRejected ? theme.color : "var(--text-1)",
                          display: "flex", alignItems: "center", gap: 8
                        }}>
                          {theme.title}
                          {isApproved && <span className="tag" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>Approved</span>}
                          {isRejected && <span className="tag" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>Rejected</span>}
                        </h4>
                      </div>
                      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>{timeAgo(n.created_at)}</span>
                        {n.step_type && <StatusBadge status={n.step_type} />}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 12 }}>
                      {n.event_type === "APPROVAL_APPROVED" || n.event_type === "WORKFLOW_COMPLETED" ? (
                        <>
                          {theme.icon} Workflow <strong style={{ color: "var(--text-1)" }}>'{n.workflow_name}'</strong> has been approved successfully.
                        </>
                      ) : n.event_type === "APPROVAL_REJECTED" || n.event_type === "WORKFLOW_FAILED" ? (
                        <>
                          {theme.icon} Workflow <strong style={{ color: "var(--text-1)" }}>'{n.workflow_name}'</strong> has been rejected at step <span style={{ color: "var(--text-1)", fontWeight: 600 }}>'{n.step_name}'</span>.
                        </>
                      ) : (
                        n.message
                      )}
                    </div>
                    <div style={{ 
                      display: "flex", flexWrap: "wrap", gap: 16, 
                      padding: "10px 14px", background: "var(--bg-input)", 
                      borderRadius: "var(--r-md)", border: "1px solid var(--border)"
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase" }}>Workflow Name</span>
                        <span style={{ fontSize: 12, color: "var(--text-1)", fontWeight: 500 }}>{n.workflow_name}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase" }}>Decision Step</span>
                        <span style={{ fontSize: 12, color: "var(--text-1)", fontWeight: 500 }}>{n.step_name}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase" }}>Execution ID</span>
                        <code style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>{n.execution_id}</code>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </Layout>
  );
}

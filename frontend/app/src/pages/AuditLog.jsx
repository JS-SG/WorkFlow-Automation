import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { getUserExecutions, getExecution, cancelExecution, retryExecution } from "../api/api";
import { FiBarChart2, FiCheckCircle, FiXCircle, FiClock, FiFileText, FiX, FiRefreshCw, FiZap } from "react-icons/fi";

function LogDetailModal({ executionId, onClose }) {
  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedApproval, setExpandedApproval] = useState(null);

  useEffect(() => {
    getExecution(executionId).then((res) => {
      setExecution(res.data);
      setLoading(false);
    });
  }, [executionId]);

  if (loading) {
    return (
      <Modal title="Execution Details" onClose={onClose} size="lg">
        <div className="fullpage-loading">
          <div className="loading-spinner" /> Loading…
        </div>
      </Modal>
    );
  }

  if (!execution) {
    return (
      <Modal title="Execution Details" onClose={onClose}>
        <div style={{ textAlign: "center" }}>Not found</div>
      </Modal>
    );
  }

  const executionData =
    typeof execution.data === "string"
      ? JSON.parse(execution.data || "{}")
      : execution.data || {};

  return (
    <Modal title="Execution Details" onClose={onClose} size="lg">

      {/* 🔹 HEADER */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
        marginBottom: 20
      }}>
        {[
          ["Execution ID", execution.id?.slice(0, 12) + "…"],
          ["Workflow", execution.workflow_name || "—"],
          ["Version", `v${execution.workflow_version}`],
          ["Status", execution.status],
        ].map(([k, v]) => (
          <div key={k} className="card">
            <div style={{ fontSize: 10, color: "var(--text-3)" }}>{k}</div>
            {k === "Status"
              ? <StatusBadge status={v} />
              : <div style={{ fontWeight: 600 }}>{v}</div>}
          </div>
        ))}
      </div>

      {/* 🔥 REQUEST DETAILS */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3>📌 Request Details</h3>

        {Object.entries(executionData._request_summary || {}).map(([key, val]) => (
          <div key={key} style={{ marginBottom: 6 }}>
            <strong>{key}:</strong> {String(val)}
          </div>
        ))}
      </div>

      {/* 🔥 APPROVAL SUMMARY (CARDS UI) */}
      {executionData._approvals?.length > 0 && (
        <div className="card">
          <h3>🧾 Approval Summary</h3>

          {executionData._approvals.map((a, i) => {
            const isOpen = expandedApproval === i;

            return (
              <div
                key={i}
                onClick={() => setExpandedApproval(isOpen ? null : i)}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  marginBottom: "10px",
                  cursor: "pointer",
                  background: isOpen ? "var(--bg-hover)" : "var(--bg-input)",
                  transition: "0.2s"
                }}
              >
                {/* HEADER */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between"
                }}>
                  <div style={{ fontWeight: 600 }}>
                    {a.action === "approved"
                      ? "✅ Approved"
                      : "❌ Rejected"}
                  </div>

                  <div style={{ fontSize: 12 }}>
                    {isOpen ? "▲" : "▼"}
                  </div>
                </div>

                {/* SHORT */}
                <div style={{
                  fontSize: 12,
                  color: "var(--text-2)",
                  marginTop: 4
                }}>
                  {a.approver_id}
                </div>

                {/* EXPANDED */}
                {isOpen && (
                  <div style={{
                    marginTop: 10,
                    borderTop: "1px solid var(--border)",
                    paddingTop: 10
                  }}>
                    <div><strong>Name:</strong> {a.approver_id.split("@")[0]}</div>
                    <div><strong>Email:</strong> {a.approver_id}</div>
                    <div><strong>Status:</strong> {a.action}</div>
                    <div><strong>Comment:</strong> {a.comments || "No comment"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                      {new Date(a.timestamp).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ❌ REMOVE LOGS COMPLETELY */}
      {/* (No Step Logs shown to users anymore) */}

    </Modal>
  );
}
export default function AuditLog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewId, setViewId] = useState(null);

  const fetchExecutions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await getUserExecutions(user.id);
      setExecutions(res.data || []);
    } catch {
      toast("Failed to load executions", "error");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchExecutions(); }, [fetchExecutions]);

  const handleCancel = async (id) => {
    try {
      await cancelExecution(id);
      toast("Canceled", "success");
      fetchExecutions();
    } catch (e) {
      toast(e.response?.data?.error || "Cannot cancel", "error");
    }
  };

  const handleRetry = async (id) => {
    try {
      await retryExecution(id);
      toast("Retrying…", "info");
      fetchExecutions();
    } catch (e) {
      toast(e.response?.data?.error || "Cannot retry", "error");
    }
  };

  const filtered = executions.filter((e) => {
    const matchSearch = !search ||
      (e.workflow_name || "").toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = executions.reduce((acc, e) => ({ ...acc, [e.status]: (acc[e.status] || 0) + 1 }), {});

  return (
    <Layout>
      {/* Stats */}
      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {[
          { icon: <FiBarChart2 />, value: executions.length, label: "Total Executions", color: "#6366f1" },
          { icon: <FiCheckCircle />, value: counts.completed || 0, label: "Completed", color: "#10b981" },
          { icon: <FiXCircle />, value: counts.failed || 0, label: "Failed", color: "#ef4444" },
          { icon: <FiClock />, value: counts.in_progress || 0, label: "In Progress", color: "#f59e0b" }
        ].map((stat, i) => (
          <div key={i} style={{
            padding: "24px",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderTop: `2px solid ${stat.color}`,
            borderRadius: "var(--r-lg)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
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

      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Audit Log</h2>
          <p>Track all workflow executions for compliance and debugging</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchExecutions}><FiRefreshCw size={14} /> Refresh</button>
      </div>

      {/* Filters */}
      <div className="search-bar">
        <div className="search-input-wrap">
          <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by workflow or execution ID…" />
        </div>
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Execution ID</th>
              <th>Workflow</th>
              <th>Version</th>
              <th>Status</th>
              <th>Steps Run</th>
              <th>Started At</th>
              <th>Ended At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}>
                <div className="fullpage-loading"><div className="loading-spinner" />Loading…</div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <div className="empty-state-icon"><FiFileText /></div>
                  <h3>No executions yet</h3>
                  <p>Execute a workflow to see it appear here</p>
                </div>
              </td></tr>
            ) : (
              filtered.map((exec) => (
                <tr key={exec.id}>
                  <td>
                    <span className="tag" title={exec.id}>{exec.id.slice(0, 8)}…</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{exec.workflow_name || "—"}</span>
                  </td>
                  <td><span className="tag">v{exec.workflow_version}</span></td>
                  <td><StatusBadge status={exec.status} /></td>
                  <td className="td-muted">{(exec.logs || []).length} steps</td>
                  <td className="td-muted">
                    {exec.started_at ? new Date(exec.started_at).toLocaleString() : "—"}
                  </td>
                  <td className="td-muted">
                    {exec.ended_at ? new Date(exec.ended_at).toLocaleString() : (
                      exec.status === "in_progress" ? (
                        <span style={{ color: "var(--blue)", fontSize: 11 }}>● Running</span>
                      ) : "—"
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setViewId(exec.id)}>
                        <FiFileText size={12} /> View Logs
                      </button>
                      {exec.status === "in_progress" && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancel(exec.id)}><FiX size={12} /></button>
                      )}
                      {exec.status === "failed" && (
                        <button className="btn btn-success btn-sm" onClick={() => handleRetry(exec.id)}><FiRefreshCw size={12} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {viewId && <LogDetailModal executionId={viewId} onClose={() => setViewId(null)} />}
    </Layout>
  );
}

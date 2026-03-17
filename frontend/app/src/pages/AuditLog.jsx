import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { getUserExecutions, getExecution, cancelExecution, retryExecution } from "../api/api";

function LogDetailModal({ executionId, onClose }) {
  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExecution(executionId).then((res) => {
      setExecution(res.data);
      setLoading(false);
    });
  }, [executionId]);

  return (
    <Modal title="Execution Logs" onClose={onClose} size="xl">
      {loading ? (
        <div className="fullpage-loading"><div className="loading-spinner" />Loading…</div>
      ) : !execution ? (
        <div style={{ color: "var(--text-3)", textAlign: "center" }}>Not found</div>
      ) : (
        <>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20
          }}>
            {[
              ["Execution ID", execution.id?.slice(0, 12) + "…"],
              ["Workflow", execution.workflow_name || "—"],
              ["Version", `v${execution.workflow_version}`],
              ["Status", execution.status],
            ].map(([k, v]) => (
              <div key={k} style={{
                background: "var(--bg-input)", border: "1px solid var(--border)",
                borderRadius: "var(--r-md)", padding: "10px 12px"
              }}>
                <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{k}</div>
                {k === "Status" ? <StatusBadge status={v} /> : (
                  <div style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 500 }}>{v}</div>
                )}
              </div>
            ))}
          </div>

          {/* Input data */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" }}>Input Data</div>
            <div className="code-block">{JSON.stringify(execution.data || {}, null, 2)}</div>
          </div>

          {/* Step logs */}
          <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600, marginBottom: 12, textTransform: "uppercase" }}>
            Step Logs ({(execution.logs || []).length})
          </div>

          {(execution.logs || []).length === 0 ? (
            <div style={{ color: "var(--text-3)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
              No step logs recorded
            </div>
          ) : (
            (execution.logs || []).map((log, idx) => (
              <div key={idx} style={{
                background: "var(--bg-input)", border: "1px solid var(--border)",
                borderRadius: "var(--r-md)", padding: "14px 16px", marginBottom: 12
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, color: "var(--text-1)", fontSize: 14 }}>{log.step_name}</span>
                  <StatusBadge status={log.step_type} />
                  <StatusBadge status={log.status} />
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-3)" }}>
                    {log.started_at && log.ended_at
                      ? `${((new Date(log.ended_at) - new Date(log.started_at)) / 1000).toFixed(2)}s`
                      : ""}
                  </span>
                </div>

                {log.error_message && (
                  <div style={{
                    background: "var(--red-bg)", border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: "var(--r-sm)", padding: "7px 10px", marginBottom: 10,
                    fontSize: 12, color: "var(--red)"
                  }}>⚠ {log.error_message}</div>
                )}

                {/* Rules evaluated */}
                {(log.evaluated_rules || []).length > 0 && (
                  <>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                      Rules Evaluated
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "var(--bg-base)" }}>
                          <th style={{ padding: "5px 8px", textAlign: "left", color: "var(--text-3)", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Condition</th>
                          <th style={{ padding: "5px 8px", textAlign: "center", color: "var(--text-3)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", width: 80 }}>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {log.evaluated_rules.map((r, ri) => (
                          <tr key={ri} style={{ borderTop: "1px solid var(--border)" }}>
                            <td style={{ padding: "6px 8px" }}>
                              <code style={{
                                fontSize: 11, color: r.result ? "var(--text-1)" : "var(--text-3)",
                                fontWeight: r.result ? 600 : 400
                              }}>{r.condition}</code>
                            </td>
                            <td style={{ padding: "6px 8px", textAlign: "center" }}>
                              <span style={{
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                width: 20, height: 20, borderRadius: "50%", fontSize: 11, fontWeight: 700,
                                background: r.result ? "var(--green-bg)" : "var(--red-bg)",
                                color: r.result ? "var(--green)" : "var(--red)"
                              }}>
                                {r.result ? "✓" : "✗"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {/* Next step */}
                {log.selected_next_step !== undefined && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-2)" }}>
                    Next Step: {log.selected_next_step
                      ? <code style={{ color: "var(--accent)", fontSize: 11 }}>{log.selected_next_step}</code>
                      : <span style={{ color: "var(--green)" }}>Workflow Completed</span>
                    }
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}
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
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{executions.length}</div>
          <div className="stat-label">Total Executions</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{counts.completed || 0}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-value">{counts.failed || 0}</div>
          <div className="stat-label">Failed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-value">{counts.in_progress || 0}</div>
          <div className="stat-label">In Progress</div>
        </div>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Audit Log</h2>
          <p>Track all workflow executions for compliance and debugging</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchExecutions}>🔄 Refresh</button>
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
                  <div className="empty-state-icon">📋</div>
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
                        📋 View Logs
                      </button>
                      {exec.status === "in_progress" && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancel(exec.id)}>⊘</button>
                      )}
                      {exec.status === "failed" && (
                        <button className="btn btn-success btn-sm" onClick={() => handleRetry(exec.id)}>🔄</button>
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

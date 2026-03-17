import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function PendingApprovals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/executions/pending");
      setApprovals(res.data);
    } catch (e) {
      toast("Failed to load pending approvals", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Pending Approvals</h2>
          <p>Review and act on workflows awaiting your decision</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchApprovals}>
          🔄 Refresh
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Workflow Name</th>
              <th>Initiator</th>
              <th>Current Step</th>
              <th>Started</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="fullpage-loading"><div className="loading-spinner" />Loading…</div></td></tr>
            ) : approvals.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <div className="empty-state-icon">✅</div>
                  <h3>All caught up!</h3>
                  <p>You have no pending approvals at this time.</p>
                </div>
              </td></tr>
            ) : (
              approvals.map((app) => (
                <tr key={app.id}>
                  <td><code style={{ fontSize: 11 }}>{app.id.slice(0, 8)}…</code></td>
                  <td><strong>{app.workflow_name}</strong></td>
                  <td>{app.triggered_by}</td>
                  <td><StatusBadge status="pending" label={app.current_step_name || 'Approval'} /></td>
                  <td className="td-muted">{new Date(app.started_at).toLocaleString()}</td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/workflow/execution/${app.id}`)}>
                      Review & Act
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { getUserWorkflows, createWorkflow, deleteWorkflow } from "../api/api";
import { FiZap, FiCheckCircle, FiLayers, FiGitCommit, FiEdit2, FiPlay, FiTrash2, FiPlus, FiSearch } from "react-icons/fi";

const PAGE_SIZE = 10;

function CreateModal({ onClose, onCreated }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Finance");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast("Workflow name is required", "error");
    setLoading(true);
    try {
      const res = await createWorkflow({ 
        name: name.trim(), 
        description, 
        category,
        input_schema: {} 
      });
      toast("Workflow created!", "success");
      onCreated(res.data);
      onClose();
    } catch (e) {
      toast(e.response?.data?.error || "Failed to create", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="New Workflow"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <span className="loading-spinner" style={{ width: 14, height: 14 }} /> : null}
            Create Workflow
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Workflow Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Expense Approval"
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className="form-label">Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="Finance">Finance</option>
          <option value="Onboarding">Onboarding</option>
          <option value="IT">IT</option>
          <option value="HR">HR</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of what this workflow does..."
          rows={3}
        />
      </div>
    </Modal>
  );
}

function DeleteModal({ workflow, onClose, onDeleted }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    try {
      await deleteWorkflow(workflow.id);
      toast("Workflow deleted", "success");
      onDeleted(workflow.id);
      onClose();
    } catch (e) {
      toast("Failed to delete", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Delete Workflow"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={confirm} disabled={loading}>
            {loading ? <span className="loading-spinner" style={{ width: 14, height: 14 }} /> : null}
            Delete
          </button>
        </>
      }
    >
      <p style={{ color: "var(--text-2)", fontSize: 14 }}>
        Are you sure you want to delete <strong style={{ color: "var(--text-1)" }}>{workflow.name}</strong>?
        This will also delete all steps, rules, and cannot be undone.
      </p>
    </Modal>
  );
}

export default function WorkflowList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [workflows, setWorkflows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchWorkflows = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await getUserWorkflows(user.id, { search, status: statusFilter, category: categoryFilter, page, limit: PAGE_SIZE });
      setWorkflows(res.data.workflows || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      toast("Failed to load workflows", "error");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, page, user]);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Quick stats
  const active = workflows.filter((w) => w.is_active).length;

  const truncateId = (id) => id ? id.slice(0, 8) + "…" : "—";

  return (
    <Layout>
      {/* Stats */}
      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {[
          { icon: <FiZap />, value: total, label: "Total Workflows", color: "#6366f1" },
          { icon: <FiCheckCircle />, value: active, label: "Active Workflows", color: "#10b981" },
          { icon: <FiLayers />, value: workflows.reduce((s, w) => s + (w.step_count || 0), 0), label: "Total Steps", color: "#8b5cf6" },
          { icon: <FiGitCommit />, value: workflows.reduce((s, w) => s + (parseInt(w.version) || 1), 0), label: "Cumulative Versions", color: "#f97316" }
        ].map((stat, i) => (
          <div key={i} style={{
            padding: "24px",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderTop: `2px solid ${stat.color}`,
            borderRadius: "var(--r-lg)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            display: "flex", flexDirection: "column", gap: "8px",
            transition: "transform 0.2s, box-shadow 0.2s",
            cursor: "default"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.2)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
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
          <h2>Workflows</h2>
          <p>Design, manage and execute automated processes</p>
        </div>
        {user?.role === "admin" && (
          <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>
            <FiPlus size={16} />
            New Workflow
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="search-bar" style={{
        display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "32px",
        background: "rgba(255,255,255,0.02)", padding: "20px",
        borderRadius: "var(--r-lg)", border: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(12px)", alignItems: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
      }}>
        <div className="search-input-wrap" style={{ flex: 1, minWidth: "250px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "100px", display: "flex", alignItems: "center", padding: "10px 16px" }}>
          <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search workflows…"
          />
        </div>
        <select className="filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select className="filter-select" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          <option value="Finance">Finance</option>
          <option value="Onboarding">Onboarding</option>
          <option value="IT">IT</option>
          <option value="HR">HR</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper" style={{
        background: "rgba(255, 255, 255, 0.02)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "var(--r-xl)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        overflow: "hidden", // vital for border-radius on table borders
        marginBottom: "40px"
      }}>
        <table style={{ background: "transparent" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Steps</th>
              <th>Version</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}>
                <div className="fullpage-loading">
                  <div className="loading-spinner" />
                  Loading workflows…
                </div>
              </td></tr>
            ) : workflows.length === 0 ? (
              <tr><td colSpan={7} style={{ background: "transparent" }}>
                <div className="empty-state" style={{
                  padding: "80px 20px",
                  background: "rgba(255, 255, 255, 0.01)",
                  border: "1px dashed rgba(255, 255, 255, 0.1)",
                  borderRadius: "var(--r-xl)",
                  margin: "60px auto",
                  maxWidth: "540px",
                  backdropFilter: "blur(10px)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "20px",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.2)"
                }}>
                  <div className="empty-state-icon" style={{
                    width: "80px", height: "80px", background: "var(--bg-hover)",
                    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "32px", color: "var(--accent)", border: "1px solid rgba(255,255,255,0.05)"
                  }}><FiZap /></div>
                  <h3 style={{ fontSize: "24px", color: "var(--text-1)", margin: 0, fontWeight: 700 }}>No workflows yet</h3>
                  <p style={{ color: "var(--text-3)", fontSize: "16px", textAlign: "center", margin: 0, lineHeight: 1.5 }}>Click <strong>"New Workflow"</strong> to create your first automated process and start scaling.</p>
                </div>
              </td></tr>
            ) : (
              workflows.map((w) => (
                <tr key={w.id}>
                  <td>
                    <span className="tag" title={w.id}>{truncateId(w.id)}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text-1)" }}>{w.name}</div>
                    {w.description && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{w.description}</div>}
                  </td>
                  <td className="td-muted">{w.step_count ?? 0} steps</td>
                  <td><span className="tag">v{w.version}</span></td>
                  <td>
                    <StatusBadge status={w.is_active ? "active" : "inactive"} />
                  </td>
                  <td className="td-muted">
                    {w.created_at ? new Date(w.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {user?.role === "admin" && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/workflows/${w.id}/edit`)}
                          title="Edit workflow"
                        >
                          <FiEdit2 size={12} style={{ marginRight: 4 }} /> Edit
                        </button>
                      )}
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/execute/${w.id}`)}
                        title="Execute workflow"
                      >
                        <FiPlay size={12} style={{ marginRight: 4 }} /> Run
                      </button>
                      {user?.role === "admin" && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteTarget(w)}
                          title="Delete workflow"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button className="page-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => Math.abs(p - page) <= 2).map((p) => (
            <button key={p} className={`page-btn${p === page ? " active" : ""}`} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button className="page-btn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>›</button>
          <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => fetchWorkflows()}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          workflow={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => fetchWorkflows()}
        />
      )}
    </Layout>
  );
}
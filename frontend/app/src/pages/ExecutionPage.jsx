import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { getWorkflow, startExecution, getExecution, cancelExecution, retryExecution, approveExecution, getExecutionDetails } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { FiCheck, FiX, FiPlay, FiBell, FiSettings, FiClock, FiFileText, FiRefreshCw, FiExternalLink } from "react-icons/fi";

function ExecutionLogs({ logs, userRole }) {
  const [expanded, setExpanded] = useState({});
  const [expandedApproval, setExpandedApproval] = useState(null);
  if (!logs || logs.length === 0)
    return <div style={{ color: "var(--text-3)", fontSize: 12, textAlign: "center", padding: "12px 0" }}>No logs yet</div>;
  const visibleLogs = logs.filter(log => {
    // ❌ hide system logs completely
      if (log.step_type === "system") return false;

    // existing role logic
      if (userRole === "admin") return true;
      if (log.step_name.includes("Management Approval")) return userRole === "admin";
      if (log.step_name.includes("Manager Approval")) return userRole === "admin" || userRole === "manager";

      return true;
  });

  return (
    <div className="step-timeline">
      {visibleLogs.map((log, idx) => {
        const isOpen = expanded[idx];
        const statusColor = log.status === "completed" ? "var(--green)" : "var(--red)";

        return (
          <div key={idx} className="step-timeline-item">
            <div className={`step-timeline-dot ${log.status}`} />

            <div style={{
              background: "var(--bg-input)",
              border: `1px solid ${log.status === "completed" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              borderRadius: "var(--r-md)",
              overflow: "hidden",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                cursor: "pointer"
              }} onClick={() => setExpanded((p) => ({ ...p, [idx]: !p[idx] }))}>
                <span style={{ fontSize: 18, color: log.status === "completed" ? "var(--green)" : "var(--red)", display: "flex", alignItems: "center" }}>
                  {log.step_type === "approval" ? <FiCheck /> : log.step_type === "notification" ? <FiBell /> : <FiSettings />}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-1)" }}>{log.step_name}</div>
                  {log.approver_id && (
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                      👤 {log.approver_id}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                    {log.started_at ? new Date(log.started_at).toLocaleTimeString() : ""}
                    {log.ended_at && ` — ${((new Date(log.ended_at) - new Date(log.started_at)) / 1000).toFixed(2)}s`}
                  </div>
                </div>
                <StatusBadge status={log.status} />
                {log.selected_next_step && (
                  <span style={{ fontSize: 11, color: "var(--accent)" }}>→ next</span>
                )}
                <span style={{ color: "var(--text-3)", fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
              </div>
              {isOpen && (
                <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border)" }}>
                  {log.error_message && (
                    <div style={{
                      background: "var(--red-bg)", border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: "var(--r-sm)", padding: "8px 12px", margin: "10px 0",
                      fontSize: 12, color: "var(--red)"
                    }}>
                      ⚠ {log.error_message}
                    </div>
                  )}

                  {/* Rules Evaluated */}
                  {log.evaluated_rules && log.evaluated_rules.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Rules Evaluated ({log.evaluated_rules.length})
                      </div>
                      {log.evaluated_rules.map((r, ri) => (
                        <div key={ri} className="rule-eval-row">
                          <span style={{
                            width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0,
                            background: r.result ? "var(--green-bg)" : "var(--red-bg)",
                            color: r.result ? "var(--green)" : "var(--red)"
                          }}>
                            {r.result ? "✓" : "✗"}
                          </span>
                          <code className="rule-eval-condition">{r.condition}</code>
                          <span style={{ fontSize: 11, fontWeight: 600, color: r.result ? "var(--green)" : "var(--text-3)" }}>
                            {r.result ? "MATCHED" : "no match"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Metadata */}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Step Metadata
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {Object.entries(log.metadata).map(([k, v]) => (
                          <span key={k} className="tag">{k}: {String(v)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
function Tracker({ steps, logs }) {
  return (
    <div style={{ 
      display: "flex", alignItems: "center", gap: 4, marginBottom: 20, 
      padding: "16px", background: "var(--bg-input)", borderRadius: "var(--r-lg)",
      border: "1px solid var(--border)", overflowX: "auto"
    }}>
      {steps.map((step, idx) => {
        const log = (logs || []).find(l => l.step_id === step.id);
        const isCompleted = log?.status === "completed";
        const isFailed = log?.status === "failed";
        const isCurrent = !log && (logs || []).length === idx;
        
        return (
          <div key={step.id} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 80 }}>
              <div style={{ 
                width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: isCompleted ? "var(--green)" : isFailed ? "var(--red)" : isCurrent ? "var(--accent)" : "var(--bg-input)",
                color: (isCompleted || isFailed || isCurrent) ? "white" : "var(--text-3)",
                fontSize: 10, fontWeight: 700, border: `2px solid ${isCurrent || isCompleted || isFailed ? "transparent" : "var(--border)"}`,
                boxShadow: isCurrent ? "0 0 10px var(--accent-glow)" : "none"
              }}>
                {isCompleted ? <FiCheck size={12} /> : isFailed ? <FiX size={12} /> : idx + 1}
              </div>
              <div style={{ 
                fontSize: 10, fontWeight: 600, textAlign: "center", maxWidth: 70, 
                color: isCurrent ? "var(--accent)" : isCompleted ? "var(--text-1)" : "var(--text-3)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}>
                {step.name}
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div style={{ 
                width: 40, height: 2, 
                background: isCompleted ? "var(--green)" : "var(--border)",
                marginTop: -16
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function InputForm({ schema, values, onChange }) {
  const fields = Object.entries(schema || {});
  if (fields.length === 0) return (
    <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", padding: "16px 0" }}>
      This workflow has no input schema defined. You can still execute it.
    </p>
  );

  return (
    <div>
      {fields.map(([key, def]) => (
        <div className="form-group" key={key}>
          <label className="form-label">
            {key}
            {def.required && <span style={{ color: "var(--red)", marginLeft: 3 }}>*</span>}
            <span style={{ marginLeft: 6, fontSize: 10, color: "var(--text-3)", fontWeight: 400 }}>
              ({def.type})
            </span>
          </label>
          {def.allowed_values && def.allowed_values.length > 0 ? (
            <select
              value={values[key] || ""}
              onChange={(e) => onChange({ ...values, [key]: def.type === "number" ? Number(e.target.value) : e.target.value })}
            >
              <option value="">— Select —</option>
              {def.allowed_values.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          ) : def.type === "boolean" ? (
            <select
              value={values[key] !== undefined ? String(values[key]) : ""}
              onChange={(e) => onChange({ ...values, [key]: e.target.value === "true" })}
            >
              <option value="">— Select —</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          ) : (
            <input
              type={def.type === "number" ? "number" : "text"}
              value={values[key] !== undefined ? values[key] : ""}
              onChange={(e) => onChange({
                ...values,
                [key]: def.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value
              })}
              placeholder={`Enter ${key}...`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function ExecutionPage() {
  const { user } = useAuth();
  const { id: workflowId, executionId: routeExecutionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inputValues, setInputValues] = useState({});
  const [executionId, setExecutionId] = useState(null);
  const [execution, setExecution] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approverEmail, setApproverEmail] = useState(""); 

  const pollRef = useRef(null);
  const workflowStepsRef = useRef([]);

  const fetchWorkflow = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWorkflow(workflowId);
      setWorkflow(res.data);
      workflowStepsRef.current = res.data.steps || [];
    } catch {
      toast("Workflow not found", "error");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [workflowId, navigate, toast]);

  const loadExecution = useCallback(async (id) => {
    setLoading(true);
    try {
      const res = await getExecutionDetails(id);
      setExecutionId(id);
      const executionData = res.data;
      setExecution(executionData);
      const currentStepMeta = executionData.currentStep;
      const resolvedApprover = currentStepMeta?.approverId || executionData.approver || "";
      if (resolvedApprover) setApproverEmail(resolvedApprover);
      const workflowObj = {
        id: executionData.workflowId,
        name: executionData.workflowName,
        steps: executionData.steps,
        input_schema: {}
      };
      setWorkflow(workflowObj);
      workflowStepsRef.current = executionData.steps; 
      startPolling(id);
    } catch (e) {
      if (e.response?.status === 404) {
        toast("Workflow execution not found or already completed.", "error");
      } else {
        toast("Error loading execution details", "error");
      }
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    if (routeExecutionId) {
      loadExecution(routeExecutionId);
    } else if (workflowId) {
      fetchWorkflow();
    }
  }, [workflowId, routeExecutionId, fetchWorkflow, loadExecution]);

  const startPolling = useCallback((execId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await getExecution(execId);
        setExecution(res.data);
        const steps = workflowStepsRef.current || [];
        const currentStep = steps.find(s => s.id === res.data.current_step_id);
        const stepType = currentStep?.step_type || currentStep?.type;
        const polledData = typeof res.data.data === "string"
          ? JSON.parse(res.data.data || "{}")
          : (res.data.data || {});
        const polledApprovalEntry = polledData?._approvals?.[res.data.current_step_id];
        const polledStepActioned = polledApprovalEntry?.action === "approved"
          || polledApprovalEntry?.action === "rejected";

        const isPendingApproval = res.data.status === "in_progress"
          && stepType === "approval"
          && !polledStepActioned;

        if (isPendingApproval) {
          setExecuting(false);
        } else if (res.data.status !== "in_progress" && res.data.status !== "pending") {
          clearInterval(pollRef.current);
          setExecuting(false);
          if (res.data.status === "completed") toast("Workflow completed! ✓", "success");
          else if (res.data.status === "failed") toast("Workflow failed", "error");
        }
      } catch {}
    }, 1000);
  }, [toast]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const handleStart = async () => {
    const schema = workflow?.input_schema || {};
    for (const [key, def] of Object.entries(schema)) {
      if (def.required && (inputValues[key] === undefined || inputValues[key] === "")) {
        toast(`Field "${key}" is required`, "error");
        return;
      }
    }

    setExecuting(true);
    setExecution(null);
    try {
      const res = await startExecution(workflowId, inputValues);
      const execId = res.data.executionId;
      setExecutionId(execId);
      setExecution({ status: "in_progress", logs: [] });
      toast("Execution started!", "info");
      startPolling(execId);
    } catch (e) {
      toast(e.response?.data?.error || "Failed to start execution", "error");
      setExecuting(false);
    }
  };

  const handleCancel = async () => {
    if (!executionId) return;
    await cancelExecution(executionId);
    clearInterval(pollRef.current);
    setExecuting(false);
    toast("Execution canceled", "warning");
    const res = await getExecution(executionId);
    setExecution(res.data);
  };

  const handleRetry = async () => {
    if (!executionId) return;
    setExecuting(true);
    await retryExecution(executionId);
    toast("Retrying…", "info");
    startPolling(executionId);
  };

  const currentStep = workflow?.steps?.find(s => s.id === execution?.current_step_id);
  const stepType = currentStep?.step_type || currentStep?.type;
  const executionData = typeof execution?.data === "string"
    ? JSON.parse(execution.data || "{}")
    : (execution?.data || {});
  const currentApprovalEntry = executionData?._approvals?.[execution?.current_step_id];
  const stepAlreadyActioned = currentApprovalEntry?.action === "approved"
    || currentApprovalEntry?.action === "rejected";

  const pendingApproval = execution?.status === "in_progress"
    && stepType === "approval"
    && !stepAlreadyActioned;

  const handleApprovalSubmit = async (action) => {
    if (!executionId || !currentStep) return;
    setExecuting(true);
    try {
      await approveExecution(executionId, {
        step_id: currentStep.id,
        action,
        approver_id: user?.email || "unknown", 
        comments: approvalNotes
      });
      toast(`Decision submitted: ${action}`, "success");
      setApprovalNotes("");
      startPolling(executionId);
    } catch (e) {
      toast(e.response?.data?.error || "Approval failed", "error");
      setExecuting(false);
    }
  };

  const handleReset = () => {
    clearInterval(pollRef.current);
    setExecutionId(null);
    setExecution(null);
    setExecuting(false);
    setInputValues({});
  };

  if (loading) return (
    <Layout>
      <div className="fullpage-loading"><div className="loading-spinner" />Loading workflow…</div>
    </Layout>
  );

  const STATUS_META = {
    in_progress: { icon: <FiClock />, color: "var(--accent)", label: "In Progress" },
    completed:   { icon: <FiCheck />, color: "var(--green)", label: "Completed" },
    failed:      { icon: <FiX />, color: "var(--red)", label: "Failed" },
    canceled:    { icon: <FiX />, color: "var(--gray)", label: "Canceled" },
    pending:     { icon: <FiClock />, color: "var(--yellow)", label: "Pending" },
  };

  const sm = execution ? STATUS_META[execution.status] : null;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("/")} style={{ padding: "4px 8px" }}>← Back</button>
            <span style={{ color: "var(--text-3)", fontSize: 12 }}>/</span>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>Execute</span>
          </div>
          <h2>Execute: {workflow?.name}</h2>
          <p>Version {workflow?.version} · {(workflow?.steps || []).length} steps</p>
        </div>
      </div>

      <div className="execution-grid" style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20 }}>
        <div>
          <div className="card">
            <div className="section-header" style={{ marginBottom: 16 }}>
              <h3>Input Data</h3>
              {execution && <button className="btn btn-ghost btn-sm" onClick={handleReset}>Reset</button>}
            </div>

            <InputForm
              schema={workflow?.input_schema || {}}
              values={inputValues}
              onChange={setInputValues}
            />

            <hr className="divider" />

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleStart}
                disabled={executing}
              >
                {executing ? (
                  <><span className="loading-spinner" style={{ width: 14, height: 14 }} /> Running…</>
                ) : (
                  <><FiPlay /> Start Execution</>
                )}
              </button>

              {executing && executionId && (
                <button className="btn btn-danger" onClick={handleCancel}>
                  <FiX /> Cancel
                </button>
              )}
            </div>

            {execution?.status === "failed" && (
              <button className="btn btn-success" style={{ width: "100%", marginTop: 8 }} onClick={handleRetry}>
                <FiRefreshCw /> Retry Failed Step
              </button>
            )}
          </div>
          {/*Object.keys(inputValues).length > 0 && (
            <div className="card" style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase" }}>
                Input Preview
              </div>
              <div className="code-block">{JSON.stringify(inputValues, null, 2)}</div>
            </div>
          )*/}
        </div>
        <div>
          {!execution ? (
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16 }}>
              <div style={{ fontSize: 56, opacity: 0.3, color: "var(--accent)" }}><FiPlay /></div>
              <h3 style={{ color: "var(--text-2)", fontWeight: 600 }}>Ready to Execute</h3>
              <p style={{ color: "var(--text-3)", textAlign: "center", maxWidth: 260, fontSize: 13 }}>
                Fill in the input data on the left and click "Start Execution" to run this workflow.
              </p>
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="section-header">
                  <h3>Workflow Tracker</h3>
                </div>
                <Tracker steps={workflow?.steps || []} logs={execution.logs || []} />
              </div>
              <div className="card" style={{ marginBottom: 20, borderColor: sm ? sm.color.replace("var(--", "rgba(").replace(")", ", 0.3)") : undefined }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 36 }}>{sm?.icon || <FiClock />}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: sm?.color || "var(--text-1)" }}>
                      {sm?.label || execution.status}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                      Execution ID: <code style={{ fontSize: 11 }}>{executionId?.slice(0, 16)}…</code>
                    </div>
                  </div>
                  {execution.status === "in_progress" && (
                    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                      {[0, 0.2, 0.4].map((d, i) => (
                        <span key={i} style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: "var(--blue)", animation: `pulse 1.2s ${d}s infinite`
                        }} />
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate("/audit")}>
                      <FiFileText size={16} /> View in Audit Log
                    </button>
                  </div>
                </div>
                {(execution.started_at || execution.ended_at) && (
                  <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "var(--text-3)" }}>
                    {execution.started_at && <span>Started: {new Date(execution.started_at).toLocaleTimeString()}</span>}
                    {execution.ended_at && <span>Ended: {new Date(execution.ended_at).toLocaleTimeString()}</span>}
                    {execution.started_at && execution.ended_at && (
                      <span>Duration: {((new Date(execution.ended_at) - new Date(execution.started_at)) / 1000).toFixed(1)}s</span>
                    )}
                    {execution.retries > 0 && <span>Retries: {execution.retries}</span>}
                  </div>
                )}
              </div>
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="section-header">
                  <h3>Step Progress</h3>
                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                    {(execution.logs || []).length} / {(workflow?.steps || []).length} steps executed
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(workflow?.steps || []).map((step, idx) => {
                    const log = (execution.logs || []).find((l) => l.step_id === step.id);
                    const isActive = !log && execution.status === "in_progress" &&
                      (execution.logs || []).length === idx;
                    return (
                      <div key={step.id} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: "var(--r-md)",
                        background: log?.status === "completed" ? "var(--green-bg)" :
                          log?.status === "failed" ? "var(--red-bg)" :
                          isActive ? "var(--blue-bg)" : "var(--bg-input)",
                        border: `1px solid ${log?.status === "completed" ? "rgba(34,197,94,0.3)" :
                          log?.status === "failed" ? "rgba(239,68,68,0.3)" :
                          isActive ? "rgba(59,130,246,0.3)" : "var(--border)"}`,
                        fontSize: 12,
                        color: log?.status === "completed" ? "var(--green)" :
                          log?.status === "failed" ? "var(--red)" :
                          isActive ? "var(--blue)" : "var(--text-3)"
                      }}>
                        {log?.status === "completed" ? "✓" : log?.status === "failed" ? "✗" : isActive ? "⌛" : "○"}
                        {step.name}
                      </div>
                    );
                  })}
                </div>
              </div>
              {pendingApproval && (
                <div className="card" style={{
                  marginBottom: 20,
                  border: "2px solid rgba(59,130,246,0.4)",
                  background: "rgba(59,130,246,0.05)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 24 }}><FiClock /></span>
                    <div>
                      <h3 style={{ fontSize: 16, color: "var(--blue)", margin: 0 }}>Approval Required</h3>
                      {/* 🔥 CLEAN APPROVAL SUMMARY */}
                      {executionData._approvals?.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                        <h4 style={{ fontSize: 14, marginBottom: 10 }}>Approval Summary</h4>

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
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <div style={{ fontWeight: 600 }}>
                                  {a.action === "approved" ? "✅ Approved" : "❌ Rejected"}
                                </div>

                                <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                                  {isOpen ? "▲" : "▼"}
                                </div>
                              </div>

                              {/* SHORT INFO */}
                              <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>
                                {a.approver_id.split("@")[0]}
                              </div>

                              {/* EXPANDED */}
                              {isOpen && (
                                <div style={{
                                  marginTop: 10,
                                  paddingTop: 10,
                                  borderTop: "1px solid var(--border)"
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
                      <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
                        Step <strong>{currentStep.name}</strong> is waiting for a decision.
                      </div>
                    </div>
                  </div>
                  
                  {(() => {
                    const localUser = (() => { try { return JSON.parse(localStorage.getItem("workflow_user")); } catch { return null; } })();
                    const activeUser = localUser || user;
                    const stepMeta = execution?.currentStep || {};
                    const resolvedApprover = approverEmail 
                      || stepMeta.approverId
                      || execution?.approver
                      || (typeof currentStep?.metadata === "string" ? JSON.parse(currentStep.metadata || "{}")?.assignee_email : currentStep?.metadata?.assignee_email)
                      || "";
                    const resolvedRole = stepMeta.approverRole
  || (typeof currentStep?.metadata === "string"
      ? JSON.parse(currentStep.metadata || "{}")?.assignee_role
      : currentStep?.metadata?.assignee_role)
  || "";

                    const isAssignedApprover = (resolvedApprover && (
                      activeUser?.id === resolvedApprover
                      || activeUser?.email === resolvedApprover
                    ));
                    
                    const userRole = activeUser?.role;
                    const isStepRoleMatch = (resolvedRole && resolvedRole === userRole) || (resolvedApprover && resolvedApprover === userRole);
                    
                    const isManagerOrAdmin = userRole === "admin" || userRole === "manager";
                    const canApprove = isAssignedApprover || isStepRoleMatch || (isManagerOrAdmin && !resolvedApprover && !resolvedRole);

                    if (!canApprove) {
                      return (
                        <div style={{ 
                          padding: "12px", 
                          background: "var(--bg-hover)", 
                          borderRadius: "var(--r-sm)",
                          fontSize: 13,
                          color: "var(--text-2)",
                          border: "1px solid var(--border)"
                        }}>
                          🔒 Viewing as <strong>Read-only</strong>. Waiting for <strong>{resolvedApprover || "assigned manager"}</strong> to review this request.
                        </div>
                      );
                    }

                    return (
                      <>
                        <textarea
                          placeholder="Add optional notes or comments..."
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          style={{ minHeight: 60, marginBottom: 12 }}
                        />
                        
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn btn-success"
                            style={{ flex: 1 }}
                            onClick={() => handleApprovalSubmit("approved")}
                            disabled={executing}
                          >
                            ✓ Approve
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ flex: 1 }}
                            onClick={() => handleApprovalSubmit("rejected")}
                            disabled={executing}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Execution Logs */}
              <div className="card">
                <div className="section-header">
                  <h3>Execution Logs</h3>
                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>{(execution.logs || []).length} entries</span>
                </div>
                <ExecutionLogs logs={execution.logs || []} userRole={user?.role} />
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import VisualRuleBuilder from "../components/VisualRuleBuilder";
import { useToast } from "../components/Toast";
import {
  getWorkflow, updateWorkflow, setStartStep,
  createStep, updateStep, deleteStep,
  getRules, createRule, updateRule, deleteRule,
} from "../api/api";

const STEP_TYPES = ["task", "approval", "notification"];

function RulesEditor({ step, allSteps, inputSchema }) {
  const toast = useToast();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRules(step.id);
      setRules(res.data || []);
    } finally {
      setLoading(false);
    }
  }, [step.id]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const saveRule = async (ruleArray) => {
    try {
      if (editing?.id) {
        // When editing, we only edit one rule (the builder ensures only one exists in edit mode)
        await updateRule(editing.id, ruleArray[0]);
        toast("Rule updated", "success");
      } else {
        // When adding, we might have multiple rules from the builder
        for (const ruleForm of ruleArray) {
          await createRule(step.id, { ...ruleForm, step_id: step.id, priority: rules.length + 1 });
        }
        toast(`${ruleArray.length} rule(s) added`, "success");
      }
      fetchRules();
      setShowBuilder(false);
      setEditing(null);
    } catch (e) {
      toast(e.response?.data?.error || "Failed to save rule(s)", "error");
    }
  };

  const removeRule = async (id) => {
    await deleteRule(id);
    toast("Rule deleted", "success");
    fetchRules();
  };

  const moveRule = async (idx, dir) => {
    const newRules = [...rules];
    const [moved] = newRules.splice(idx, 1);
    newRules.splice(idx + dir, 0, moved);
    await Promise.all(newRules.map((r, i) => updateRule(r.id, { priority: i + 1 })));
    setRules(newRules.map((r, i) => ({ ...r, priority: i + 1 })));
  };

  // Helper: humanize condition for display
  const humanizeCondition = (condition) => {
    if (!condition || condition === "DEFAULT") return { label: "DEFAULT", isDefault: true };
    return { label: condition, isDefault: false };
  };

  return (
    <div>
      <div className="section-header">
        <h3 style={{ fontSize: 12, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Routing Rules ({rules.length})
        </h3>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { setEditing({}); setShowBuilder(true); }}
        >
          + Add Rule
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "12px 0", color: "var(--text-3)", fontSize: 12 }}>Loading rules…</div>
      ) : rules.length === 0 ? (
        <div style={{
          padding: "24px 16px", textAlign: "center", color: "var(--text-3)", fontSize: 12,
          border: "1px dashed var(--border)", borderRadius: "var(--r-md)"
        }}>
          <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>🔀</div>
          <div style={{ fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>No routing rules yet</div>
          <div>Add rules to define where the workflow goes after this step.</div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 10 }}
            onClick={() => { setEditing({}); setShowBuilder(true); }}
          >
            + Add First Rule
          </button>
        </div>
      ) : (
        <div className="table-wrapper" style={{ marginTop: 10, border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
          <table style={{ margin: 0, width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--bg-input)" }}>
              <tr>
                <th style={{ width: 60, padding: "10px 12px", textAlign: "center", fontSize: 10, textTransform: "uppercase", color: "var(--text-3)" }}>Priority</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, textTransform: "uppercase", color: "var(--text-3)" }}>Condition</th>
                <th style={{ width: 140, padding: "10px 12px", textAlign: "left", fontSize: 10, textTransform: "uppercase", color: "var(--text-3)" }}>Next Step</th>
                <th style={{ width: 80, padding: "10px 12px", textAlign: "right", fontSize: 10, textTransform: "uppercase", color: "var(--text-3)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, idx) => {
                const { label, isDefault } = humanizeCondition(rule.condition);
                return (
                  <tr key={rule.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <button className="btn btn-ghost btn-sm" style={{ padding: 2, height: "auto" }} onClick={() => moveRule(idx, -1)} disabled={idx === 0}>▲</button>
                        <span style={{ fontSize: 12, fontWeight: 800 }}>{idx + 1}</span>
                        <button className="btn btn-ghost btn-sm" style={{ padding: 2, height: "auto" }} onClick={() => moveRule(idx, 1)} disabled={idx === rules.length - 1}>▼</button>
                      </div>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {isDefault ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: "var(--yellow-bg)", color: "var(--yellow)",
                          border: "1px solid rgba(245,158,11,0.3)",
                          borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                        }}>
                          ⭐ DEFAULT
                        </span>
                      ) : (
                        <code style={{ fontSize: 11, color: "var(--text-2)", wordBreak: "break-all" }}>{label}</code>
                      )}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {rule.next_step_id ? (
                        <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                          → {allSteps.find(s => s.id === rule.next_step_id)?.name || "Step"}
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--green)", fontWeight: 600 }}>
                          ✅ End
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(rule); setShowBuilder(true); }}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => removeRule(rule.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Visual Rule Builder Modal */}
      {showBuilder && (
        <VisualRuleBuilder
          rule={editing}
          steps={allSteps.filter(s => s.id !== step.id)}
          inputSchema={inputSchema}
          stepType={step.step_type}
          onSave={saveRule}
          onClose={() => { setShowBuilder(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Step Form Modal
// ──────────────────────────────────────────────────────────────
function StepFormModal({ step, workflowId, onSave, onClose }) {
  const [name, setName] = useState(step?.name || "");
  const [stepType, setStepType] = useState(step?.step_type || "task");
  const [assignee, setAssignee] = useState(step?.metadata?.assignee_email || "");
  const [assigneeRole, setAssigneeRole] = useState(step?.metadata?.assignee_role || "");
  const [notifyTarget, setNotifyTarget] = useState(step?.metadata?.notification_target || "");
  const [channel, setChannel] = useState(step?.metadata?.notification_channel || "");
  const [instructions, setInstructions] = useState(step?.metadata?.instructions || "");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!name.trim()) return toast("Step name is required", "error");
    setLoading(true);
    const meta = {};
    if (assignee) meta.assignee_email = assignee;
    if (assigneeRole) meta.assignee_role = assigneeRole;
    if (notifyTarget) meta.notification_target = notifyTarget;
    if (channel) meta.notification_channel = channel;
    if (instructions) meta.instructions = instructions;
    await onSave({ name: name.trim(), step_type: stepType, metadata: meta });
    setLoading(false);
  };

  return (
    <Modal
      title={step?.id ? "Edit Step" : "Add Step"}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <span className="loading-spinner" style={{ width: 14, height: 14 }} /> : null}
            {step?.id ? "Save Changes" : "Add Step"}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Step Name *</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Manager Approval" autoFocus />
      </div>
      <div className="form-group">
        <label className="form-label">Step Type *</label>
        <select value={stepType} onChange={e => setStepType(e.target.value)}>
          {STEP_TYPES.map(t => (
            <option key={t} value={t}>
              {t === "task" ? "⚙️ Task" : t === "approval" ? "✅ Approval" : "🔔 Notification"}
            </option>
          ))}
        </select>
        <span className="form-hint">
          {stepType === "task" && "An automated action (e.g. update DB, generate report)"}
          {stepType === "approval" && "Requires a user to approve before proceeding"}
          {stepType === "notification" && "Sends an alert/message to a user or channel"}
        </span>
      </div>

      {stepType === "approval" && (
        <div className="form-group">
            <label className="form-label">Approver Role</label>
            <select value={assigneeRole} onChange={e => setAssigneeRole(e.target.value)}>
                <option value="">— Select a role —</option>
                <option value="department_head">🏢 Department Head (auto-resolved by submitter's dept)</option>
                <option value="hr">👥 HR Manager</option>
                <option value="manager">🧑‍💼 Manager</option>
                <option value="ceo">👑 CEO</option>
            </select>
            <span className="form-hint">
                Role is resolved dynamically at runtime — e.g. "department_head" will notify the
                correct dept head based on who submits the workflow.
            </span>
        </div>
      )}
      {stepType === "notification" && (
        <>
          <div className="form-group">
            <label className="form-label">Notification To (Email)</label>
            <input value={notifyTarget} onChange={e => setNotifyTarget(e.target.value)} placeholder="team@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Channel</label>
            <select value={channel} onChange={e => setChannel(e.target.value)} style={{ width: "100%" }}>
              <option value="">Select channel…</option>
              <option value="email">📧 Email</option>
              <option value="slack">💬 Slack</option>
              <option value="teams">🟦 Teams</option>
              <option value="dashboard">📋 Dashboard only</option>
              <option value="sms">📱 SMS</option>
            </select>
          </div>
        </>
      )}
      <div className="form-group">
        <label className="form-label">Instructions / Notes</label>
        <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2}
          placeholder="Any instructions for this step..." />
      </div>
    </Modal>
  );
}

function SchemaFieldRow({ name, def, onUpdate, onRemove }) {
  const [localName, setLocalName] = useState(name);

  // Sync if name changes from outside (e.g. deletion elsewhere)
  useEffect(() => {
    setLocalName(name);
  }, [name]);

  const handleNameBlur = () => {
    if (localName !== name && localName.trim()) {
      onUpdate(name, localName.trim(), def);
    } else {
      setLocalName(name); // Reset if empty or no change
    }
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
      borderRadius: "var(--r-md)", padding: "10px", marginBottom: 10
    }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={localName}
          onChange={e => setLocalName(e.target.value)}
          onBlur={handleNameBlur}
          placeholder="field name"
          style={{ flex: 1, fontSize: 13, padding: "6px 10px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}
        />
        <button className="btn btn-danger btn-sm" onClick={() => onRemove(name)} style={{ padding: "4px 8px" }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center" }}>
        <select
          value={def.type || "string"}
          onChange={e => onUpdate(name, name, { ...def, type: e.target.value })}
          style={{ fontSize: 11, padding: "4px 6px", height: "auto" }}
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer", color: "var(--text-3)" }}>
          <input
            type="checkbox"
            checked={def.required || false}
            onChange={e => onUpdate(name, name, { ...def, required: e.target.checked })}
            style={{ width: "auto", height: "auto" }}
          />
          Req
        </label>
        <input
          value={(def.allowed_values || []).join(",")}
          onChange={e => onUpdate(name, name, {
            ...def,
            allowed_values: e.target.value ? e.target.value.split(",").map(v => v.trim()) : undefined
          })}
          placeholder="options (a,b,c)"
          title="Allowed values (comma-separated)"
          style={{ fontSize: 11, padding: "4px 6px", width: 80, height: "auto" }}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Schema Field Editor
// ──────────────────────────────────────────────────────────────
function SchemaEditor({ schema, onChange }) {
  const fields = Object.entries(schema || {});

  const addField = () => {
    const key = `field_${fields.length + 1}`;
    onChange({ ...schema, [key]: { type: "string", required: true } });
  };

  const updateField = (oldKey, newKey, def) => {
    if (!newKey.trim()) return; // Don't allow empty keys
    
    const entries = Object.entries(schema || {}).map(([k, v]) =>
      k === oldKey ? [newKey, def] : [k, v]
    );
    onChange(Object.fromEntries(entries));
  };

  const removeField = (key) => {
    const { [key]: _, ...rest } = schema || {};
    onChange(rest);
  };

  return (
    <div>
      {fields.map(([key, def]) => (
        <SchemaFieldRow
          key={key}
          name={key}
          def={def}
          onUpdate={updateField}
          onRemove={removeField}
        />
      ))}
      <button className="btn btn-secondary btn-sm" onClick={addField} style={{ marginTop: 4 }}>
        + Add Field
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main WorkflowEditor Page
// ──────────────────────────────────────────────────────────────
import { useAuth } from "../context/AuthContext";

export default function WorkflowEditor() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  const [workflow, setWorkflow] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Finance");
  const [inputSchema, setInputSchema] = useState({});

  const [showStepForm, setShowStepForm] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);

  const fetchWorkflow = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWorkflow(id);
      const wf = res.data;
      setWorkflow(wf);
      setName(wf.name || "");
      setDescription(wf.description || "");
      setCategory(wf.category || "Finance");
      setInputSchema(wf.input_schema || {});
      setSteps(wf.steps || []);
    } catch {
      toast("Failed to load workflow", "error");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchWorkflow(); }, [fetchWorkflow]);

  const saveWorkflow = async () => {
    if (!name.trim()) return toast("Workflow name is required", "error");
    setSaving(true);
    try {
      await updateWorkflow(id, { name, description, category, input_schema: inputSchema });
      toast("Workflow saved! ✓", "success");
      fetchWorkflow();
    } catch {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStepSave = async (data) => {
    try {
      if (editingStep?.id) {
        await updateStep(editingStep.id, data);
        toast("Step updated", "success");
      } else {
        await createStep(id, data);
        toast("Step added", "success");
      }
      setShowStepForm(false);
      setEditingStep(null);
      fetchWorkflow();
    } catch {
      toast("Failed to save step", "error");
    }
  };

  const handleDeleteStep = async (stepId) => {
    if (!window.confirm("Delete this step and all its rules?")) return;
    await deleteStep(stepId);
    toast("Step deleted", "success");
    fetchWorkflow();
  };

  const handleSetStartStep = async (stepId) => {
    await setStartStep(id, stepId);
    toast("Start step updated", "success");
    fetchWorkflow();
  };

  if (loading) return (
    <Layout>
      <div className="fullpage-loading"><div className="loading-spinner" />Loading workflow…</div>
    </Layout>
  );

  return (
    <Layout>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("/")} style={{ padding: "4px 8px" }}>← Back</button>
            <span style={{ color: "var(--text-3)", fontSize: 12 }}>/</span>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>Workflows</span>
          </div>
          <h2>{name || workflow?.name}</h2>
          <p>
            <span className="tag" style={{ marginRight: 8, background: "rgba(99,102,241,0.1)", color: "var(--accent)" }}>{category || "Finance"}</span>
            Version {workflow?.version} · {steps.length} steps · <StatusBadge status={workflow?.is_active ? "active" : "inactive"} />
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary btn-lg" onClick={saveWorkflow} disabled={saving}>
            {saving ? <span className="loading-spinner" style={{ width: 14, height: 14 }} /> : "💾"}
            Save Changes
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        {/* LEFT: Basic info + Steps */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="section-header"><h3>Basic Information</h3></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 12, marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Workflow Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="Finance">Finance</option>
                  <option value="Onboarding">Onboarding</option>
                  <option value="IT">IT</option>
                  <option value="HR">HR</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
          </div>

          <div className="card">
            <div className="section-header">
              <h3>Steps ({steps.length})</h3>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditingStep(null); setShowStepForm(true); }}>
                + Add Step
              </button>
            </div>

            {steps.length === 0 ? (
              <div className="empty-state" style={{ padding: "32px 0" }}>
                <div className="empty-state-icon">📋</div>
                <h3>No steps yet</h3>
                <p>Add your first step to start building this workflow</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {steps.map((step, idx) => (
                  <div key={step.id} className="step-card">
                    {/* Step Header */}
                    <div
                      className="step-card-header"
                      onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                    >
                      <div className="step-order-badge">{idx + 1}</div>
                      <span style={{ flex: 1 }}>
                        <strong style={{ color: "var(--text-1)", fontSize: 13 }}>{step.name}</strong>
                      </span>
                      <StatusBadge status={step.step_type} />
                      {workflow?.start_step_id === step.id && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: "var(--accent)",
                          background: "rgba(99,102,241,0.12)", padding: "2px 7px",
                          borderRadius: 99, border: "1px solid rgba(99,102,241,0.3)"
                        }}>START</span>
                      )}
                      <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                        {workflow?.start_step_id !== step.id && (
                          <button className="btn btn-success btn-sm" title="Set as start step" onClick={() => handleSetStartStep(step.id)}>🚀</button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditingStep(step); setShowStepForm(true); }}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteStep(step.id)}>🗑</button>
                      </div>
                      <span style={{ color: "var(--text-3)", fontSize: 14 }}>
                        {expandedStep === step.id ? "▲" : "▼"}
                      </span>
                    </div>

                    {/* Step Body */}
                    {expandedStep === step.id && (
                      <div className="step-card-body">
                        {/* Metadata */}
                        {Object.keys(step.metadata || {}).length > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              Metadata
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {Object.entries(step.metadata).map(([k, v]) => (
                                <span key={k} className="tag">{k}: {String(v)}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Notification tip for notification steps */}
                        {step.step_type === "notification" && (
                          <div style={{
                            padding: "8px 12px", background: "var(--blue-bg)",
                            border: "1px solid rgba(59,130,246,0.25)", borderRadius: "var(--r-sm)",
                            fontSize: 12, color: "var(--blue)", marginBottom: 12,
                          }}>
                            🔔 This step will automatically send a dashboard notification when executed.
                            {step.metadata?.notification_target && ` Email will be sent to: ${step.metadata.notification_target}`}
                          </div>
                        )}
                        {step.step_type === "approval" && (
                          <div style={{
                            padding: "8px 12px", background: "var(--purple-bg)",
                            border: "1px solid rgba(168,85,247,0.25)", borderRadius: "var(--r-sm)",
                            fontSize: 12, color: "var(--purple)", marginBottom: 12,
                          }}>
                            ✅ Approver role: {step.metadata?.assignee_role? step.metadata.assignee_role.replace(/_/g, " ").toUpperCase()
                                                : step.metadata?.assignee_email || "No assignee set"}
                          </div>
                        )}
                        {/* Rules */}
                        <RulesEditor step={step} allSteps={steps} inputSchema={inputSchema} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Input Schema + Info */}
        <div>
          <div className="card">
            <div className="section-header"><h3>Input Schema</h3></div>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 14 }}>
              Define the data fields this workflow accepts. These fields will be available in rule conditions.
            </p>
            <SchemaEditor schema={inputSchema} onChange={setInputSchema} />
            {Object.keys(inputSchema).length > 0 && (
              <>
                <hr className="divider" />
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>Preview JSON</div>
                <div className="code-block">{JSON.stringify(inputSchema, null, 2)}</div>
              </>
            )}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10, fontWeight: 600 }}>EXECUTION INFO</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["Start Step", steps.find(s => s.id === workflow?.start_step_id)?.name || "Not set"],
                ["Total Steps", steps.length],
                ["Version", `v${workflow?.version}`],
                ["Schema Fields", Object.keys(inputSchema).length],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-3)" }}>{k}</span>
                  <span style={{ color: "var(--text-1)", fontWeight: 500 }}>{String(v)}</span>
                </div>
              ))}
            </div>
            <hr className="divider" />
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => navigate(`/execute/${id}`)}>
              ▶ Execute Workflow
            </button>
          </div>

          {/* Rule builder help box */}
          <div className="card" style={{ marginTop: 16, borderColor: "rgba(99,102,241,0.3)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>💡 Rule Builder Tips</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.7 }}>
              <div>• Add fields to the <strong style={{ color: "var(--text-2)" }}>Input Schema</strong> first — they'll appear as dropdown options in the rule builder</div>
              <div>• Rules are evaluated <strong style={{ color: "var(--text-2)" }}>top-to-bottom</strong> by priority</div>
              <div>• Always add a <strong style={{ color: "var(--yellow)" }}>DEFAULT</strong> rule as the last rule to handle unmatched cases</div>
              <div>• Use <strong style={{ color: "var(--text-2)" }}>AND/OR</strong> to combine multiple conditions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Form Modal */}
      {showStepForm && (
        <StepFormModal
          step={editingStep}
          workflowId={id}
          onSave={handleStepSave}
          onClose={() => { setShowStepForm(false); setEditingStep(null); }}
        />
      )}
    </Layout>
  );
}
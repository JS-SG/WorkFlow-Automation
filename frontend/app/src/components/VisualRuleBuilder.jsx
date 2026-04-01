import { useState } from "react";
import Modal from "./Modal";

// ─── Operator definitions ─────────────────────────────────────
const OPERATORS = {
  number: [
    { label: "equals (==)", value: "==" },
    { label: "not equals (!=)", value: "!=" },
    { label: "greater than (>)", value: ">" },
    { label: "less than (<)", value: "<" },
    { label: "≥ greater or equal", value: ">=" },
    { label: "≤ less or equal", value: "<=" },
  ],
  string: [
    { label: "equals (==)", value: "==" },
    { label: "not equals (!=)", value: "!=" },
    { label: "contains", value: "contains" },
    { label: "starts with", value: "startsWith" },
    { label: "ends with", value: "endsWith" },
  ],
  boolean: [
    { label: "is true (==)", value: "== true" },
    { label: "is false (==)", value: "== false" },
  ],
  any: [
    { label: "equals (==)", value: "==" },
    { label: "not equals (!=)", value: "!=" },
    { label: "greater than (>)", value: ">" },
    { label: "less than (<)", value: "<" },
    { label: "≥ greater or equal", value: ">=" },
    { label: "≤ less or equal", value: "<=" },
    { label: "contains", value: "contains" },
    { label: "starts with", value: "startsWith" },
    { label: "ends with", value: "endsWith" },
  ],
};

// Build a single condition expression string
function buildCondition(field, operator, value, fieldType) {
  if (!field || !operator) return "";

  if (fieldType === "boolean") return `${field} ${operator}`;

  const isString = fieldType === "string" || ["contains", "startsWith", "endsWith"].includes(operator);
  const stringOps = ["contains", "startsWith", "endsWith"];

  if (stringOps.includes(operator)) {
    return `${operator}(${field}, "${value}")`;
  }

  if (isString && !["==", "!="].includes(operator)) {
    return `${field} ${operator} "${value}"`;
  }

  if (typeof value === "string" && fieldType === "string") {
    return `${field} ${operator} '${value}'`;
  }

  return `${field} ${operator} ${value}`;
}

// Parse an existing condition string back to conditions array (best-effort)
function parseCondition(conditionStr) {
  if (!conditionStr || conditionStr === "DEFAULT") return [];

  const groups = conditionStr.split(/\s*&&\s*|\s*\|\|\s*/);
  const logics = (conditionStr.match(/\s*&&\s*|\s*\|\|\s*/g) || []).map(s => s.trim());

  return groups.map((part, i) => {
    part = part.trim();

    // contains / startsWith / endsWith
    const fnMatch = part.match(/^(contains|startsWith|endsWith)\((\w+),\s*"([^"]*)"\)$/);
    if (fnMatch) {
      return { field: fnMatch[2], operator: fnMatch[1], value: fnMatch[3], logic: logics[i] || "&&" };
    }

    // comparison  field op value
    const cmpMatch = part.match(/^(\w+)\s*(==|!=|>=|<=|>|<)\s*['"]?([^'"]+)['"]?$/);
    if (cmpMatch) {
      return { field: cmpMatch[1], operator: cmpMatch[2], value: cmpMatch[3].trim(), logic: logics[i] || "&&" };
    }

    return { field: part, operator: "==", value: "", logic: logics[i] || "&&" };
  });
}

// ─── Single Condition Row ─────────────────────────────────────
function ConditionRow({ condition, index, schemaFields, steps, onUpdate, onRemove }) {
  const field = schemaFields.find(f => f.name === condition.field);
  const fieldType = field?.type || "any";
  const ops = OPERATORS[fieldType] || OPERATORS.any;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 140px 1fr 180px 32px",
        gap: 8,
        background: "var(--bg-input)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        padding: "10px 12px",
        alignItems: "center",
      }}>
        {/* Field selector */}
        <div>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 3, fontWeight: 600 }}>FIELD</div>
          {condition.isDefault ? (
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--yellow)", padding: "6px 0" }}>DEFAULT</div>
          ) : (
            <>
              <select
                value={condition.field}
                onChange={e => onUpdate({ ...condition, field: e.target.value, operator: "==", value: "" })}
                style={{ padding: "6px 8px", fontSize: 12 }}
              >
                <option value="">Select field…</option>
                {schemaFields.map(f => (
                  <option key={f.name} value={f.name}>{f.name}</option>
                ))}
                <option value="__custom__">Enter custom…</option>
              </select>
              {condition.field === "__custom__" && (
                <input
                  style={{ marginTop: 6, fontSize: 12, padding: "6px 8px" }}
                  placeholder="field_name"
                  value={condition.customField || ""}
                  onChange={e => onUpdate({ ...condition, customField: e.target.value })}
                />
              )}
            </>
          )}
        </div>

        {/* Operator selector */}
        {!condition.isDefault && (
          <div>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 3, fontWeight: 600 }}>OPERATOR</div>
            <select
              value={condition.operator}
              onChange={e => onUpdate({ ...condition, operator: e.target.value })}
              style={{ padding: "6px 8px", fontSize: 12 }}
            >
              {ops.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Value input */}
        {!condition.isDefault && (
          <div>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 3, fontWeight: 600 }}>VALUE</div>
            {fieldType === "boolean" ? (
              <div style={{ fontSize: 12, color: "var(--text-3)", padding: "6px 0" }}>(auto)</div>
            ) : field?.allowed_values?.length > 0 ? (
              <select
                value={condition.value}
                onChange={e => onUpdate({ ...condition, value: e.target.value })}
                style={{ padding: "6px 8px", fontSize: 12 }}
              >
                <option value="">Select value…</option>
                {field.allowed_values.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            ) : (
              <input
                value={condition.value}
                onChange={e => onUpdate({ ...condition, value: e.target.value })}
                placeholder={fieldType === "number" ? "e.g. 0" : "value"}
                type={fieldType === "number" ? "number" : "text"}
                style={{ padding: "6px 8px", fontSize: 12 }}
              />
            )}
          </div>
        )}

        {/* Routing */}
        <div style={{ gridColumn: condition.isDefault ? "2 / span 3" : "auto" }}>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 3, fontWeight: 600 }}>THEN ROUTE TO</div>
          <select 
            value={condition.next_step_id || ""} 
            onChange={e => onUpdate({ ...condition, next_step_id: e.target.value })}
            style={{ padding: "6px 8px", fontSize: 12, border: "1px solid var(--accent-30)" }}
          >
            <option value="">End Workflow</option>
            {steps.map(s => (
              <option key={s.id} value={s.id}>→ {s.name}</option>
            ))}
          </select>
        </div>

        {/* Remove button */}
        <button
          className="btn btn-danger btn-icon"
          onClick={onRemove}
          style={{ alignSelf: "flex-end", marginBottom: 0 }}
        >×</button>
      </div>
    </div>
  );
}

// ─── Main Visual Rule Builder Modal ──────────────────────────
export default function VisualRuleBuilder({ rule, steps, inputSchema, stepType, onSave, onClose }) {
  const schemaFields = Object.entries(inputSchema || {}).map(([name, def]) => ({
    name, type: def.type || "string", required: def.required,
    allowed_values: def.allowed_values || [],
  }));

  if (stepType === "approval") {
    schemaFields.unshift({
      name: "approval_action",
      type: "string",
      required: false,
      allowed_values: ["approved", "rejected"],
    });
  }

  const [conditions, setConditions] = useState(() => {
    if (rule?.id) {
      const isDef = rule.condition === "DEFAULT";
      return [{ 
        field: isDef ? "" : (parseCondition(rule.condition)[0]?.field || ""), 
        operator: isDef ? "==" : (parseCondition(rule.condition)[0]?.operator || "=="), 
        value: isDef ? "" : (parseCondition(rule.condition)[0]?.value || ""), 
        next_step_id: rule.next_step_id || "",
        isDefault: isDef
      }];
    }
    return [{ field: "", operator: "==", value: "", next_step_id: "", isDefault: false }];
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const addCondition = (isDefault = false) => {
    setConditions(prev => [...prev, { 
      field: "", operator: "==", value: "", next_step_id: "", isDefault 
    }]);
  };

  const updateCondition = (idx, updated) => {
    setConditions(prev => prev.map((c, i) => i === idx ? updated : c));
  };

  const removeCondition = (idx) => {
    setConditions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setError("");
    
    const validRules = conditions.map(c => {
      let finalCondition = "";
      if (c.isDefault) {
        finalCondition = "DEFAULT";
      } else {
        const fieldName = c.field === "__custom__" ? (c.customField || "") : c.field;
        if (!fieldName) return null;
        finalCondition = buildCondition(fieldName, c.operator, c.value, schemaFields.find(f => f.name === fieldName)?.type || "any");
      }
      return { condition: finalCondition, next_step_id: c.next_step_id || null };
    }).filter(Boolean);

    if (validRules.length === 0) return setError("Please configure at least one valid rule.");
    
    setLoading(true);
    // Return the array for the parent to handle
    await onSave(validRules);
    setLoading(false);
  };

  return (
    <Modal
      title={rule?.id ? "Edit Rule" : "Rule Mapper"}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? <span className="loading-spinner" style={{ width: 14, height: 14 }} /> : null}
            {rule?.id ? "Save Mapping" : "Create Mappings"}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 15 }}>
          Specify the next step for each condition. Rules will be evaluated in the order shown here.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {conditions.map((cond, idx) => (
            <ConditionRow
              key={idx}
              index={idx}
              condition={cond}
              schemaFields={schemaFields}
              steps={steps}
              onUpdate={updated => updateCondition(idx, updated)}
              onRemove={() => removeCondition(idx)}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => addCondition(false)}>
            + Add Condition Route
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => addCondition(true)} style={{ color: "var(--yellow)" }}>
            + Add Default Route
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: "8px 12px", background: "var(--red-bg)",
          border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--r-sm)",
          fontSize: 12, color: "var(--red)", marginTop: 8, fontWeight: 600
        }}>! {error}</div>
      )}
    </Modal>
  );
}

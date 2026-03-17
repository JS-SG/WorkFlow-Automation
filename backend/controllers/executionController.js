const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const runWorkflow = require("../engine/workflowRunner");
const { createNotification } = require("./notificationController");

function dbGet(query, params) {
  return new Promise((resolve, reject) =>
    db.get(query, params, (err, row) => (err ? reject(err) : resolve(row)))
  );
}

function dbAll(query, params) {
  return new Promise((resolve, reject) =>
    db.all(query, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );
}

function dbRun(query, params) {
  return new Promise((resolve, reject) =>
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    })
  );
}

function buildEffectiveChain(fullChain, initiatorRole) {
  if (!Array.isArray(fullChain) || fullChain.length === 0) return [];
  const pos = fullChain.indexOf(initiatorRole);
  if (pos === -1) return fullChain; // role not in chain => run full chain
  return fullChain.slice(pos + 1);  // only roles AFTER the initiator
}

async function findFirstRelevantStep(steps, initiatorRole) {
  const row = await dbGet(
    `SELECT chain FROM approval_chains WHERE initiator_role='employee'`,
    []
  );
  const hierarchy = row ? JSON.parse(row.chain) : [];
  const initiatorIndex = hierarchy.indexOf(initiatorRole);

  for (const step of steps) {
    const meta = JSON.parse(step.metadata || "{}");
    const stepRole = meta.assignee_role || null;

    if (!stepRole) return step;

    const stepRoleIndex = hierarchy.indexOf(stepRole);
    if (stepRoleIndex === -1 || stepRoleIndex > initiatorIndex) {
      return step;
    }
  }

  return null;
}

exports.startExecution = async (req, res) => {
  try {
    const execId = uuidv4();
    const { workflow_id } = req.params;
    const inputData = req.body;
    const triggeredBy = req.headers["x-user-email"] || "anonymous";
    const userRole = req.headers["x-user-role"];
    const userDept = req.headers["x-user-department"] || null;
    const now = new Date().toISOString();

    const workflow = await dbGet(`SELECT * FROM workflows WHERE id=?`, [workflow_id]);
    if (!workflow) return res.status(404).json({ error: "Workflow not found" });

    const isManual = !!workflow.start_step_id;

    // ── DYNAMIC CHAIN PATH ──────────────────────────────────────────────────
    if (!isManual) {
      const chainRow = await dbGet(
        `SELECT chain FROM approval_chains WHERE initiator_role=?`,
        [userRole]
      );

      if (!chainRow) {
        return res.status(400).json({
          error: `No approval chain configured for role: ${userRole}`,
        });
      }

      const fullChain = JSON.parse(chainRow.chain);
      const effectiveChain = buildEffectiveChain(fullChain, userRole);

      let status = "in_progress";
      let endedAt = null;
      const startStep = effectiveChain.length > 0 ? "dynamic_step_0" : "dynamic_completed";

      if (effectiveChain.length === 0) {
        status = "completed";
        endedAt = now;
      }

      const executionData = {
        ...inputData,
        _dynamic_chain: effectiveChain,
        _full_chain: fullChain,
        _initiator_role: userRole,
        current_chain_index: 0,
        initiator_department: userDept,
      };

      await dbRun(
        `INSERT INTO executions (id, workflow_id, workflow_version, status, data, logs, current_step_id, retries, triggered_by, started_at, ended_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [execId, workflow_id, workflow.version, status, JSON.stringify(executionData),
         JSON.stringify([]), startStep, 0, triggeredBy, now, endedAt]
      );

      if (status === "in_progress") {
        runWorkflow(execId).catch((e) => console.error("Workflow run error:", e));
      }

      return res.json({ executionId: execId, status });
    }

    // ── STATIC / MANUAL WORKFLOW PATH ────────────────────────────────────────
    const allSteps = await dbAll(
      `SELECT * FROM steps WHERE workflow_id=? ORDER BY step_order ASC`,
      [workflow_id]
    );

    if (allSteps.length === 0) {
      return res.status(400).json({ error: "Workflow has no steps configured" });
    }

    const firstRelevantStep = await findFirstRelevantStep(allSteps, userRole);

    let status = "in_progress";
    let endedAt = null;
    let startStepId;

    if (!firstRelevantStep) {
      status = "completed";
      endedAt = now;
      startStepId = "completed_on_start";
    } else {
      startStepId = firstRelevantStep.id;
    }

    const executionData = {
      ...inputData,
      _initiator_role: userRole,
      initiator_department: userDept,
      _skipped_to_step: firstRelevantStep ? firstRelevantStep.id : null,
    };

    await dbRun(
      `INSERT INTO executions (id, workflow_id, workflow_version, status, data, logs, current_step_id, retries, triggered_by, started_at, ended_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [execId, workflow_id, workflow.version, status, JSON.stringify(executionData),
       JSON.stringify([]), startStepId, 0, triggeredBy, now, endedAt]
    );

    if (status === "in_progress") {
      runWorkflow(execId).catch((e) => console.error("Workflow run error:", e));
    }

    return res.json({ executionId: execId, status });
  } catch (err) {
    console.error("startExecution error:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getExecution = (req, res) => {
  const { id } = req.params;
  db.get(`SELECT * FROM executions WHERE id=?`, [id], (err, execution) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!execution) return res.status(404).json({ error: "Execution not found" });

    execution.data = JSON.parse(execution.data || "{}");
    execution.logs = JSON.parse(execution.logs || "[]");

    db.get(`SELECT name FROM workflows WHERE id=?`, [execution.workflow_id], (e, w) => {
      execution.workflow_name = w ? w.name : "";
      res.json(execution);
    });
  });
};

exports.getExecutionDetails = (req, res) => {
  let { id } = req.params;
  if (id && id.startsWith("{") && id.endsWith("}")) {
    id = id.substring(1, id.length - 1);
  }

  db.get(
    `SELECT e.*, w.name as workflow_name FROM executions e
     LEFT JOIN workflows w ON e.workflow_id=w.id WHERE e.id=?`,
    [id],
    (err, execution) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!execution)
        return res.status(404).json({ error: "Execution not found or already completed." });

      db.all(
        `SELECT * FROM steps WHERE workflow_id=? ORDER BY step_order ASC`,
        [execution.workflow_id],
        (err2, staticSteps) => {
          if (err2) return res.status(500).json({ error: err2.message });

          const data = JSON.parse(execution.data || "{}");
          let steps = staticSteps.map((s) => {
            const m = JSON.parse(s.metadata || "{}");
            return {
              id: s.id,
              name: s.name,
              step_type: s.step_type,
              type: s.step_type,
              metadata: s.metadata,
              approverId: m.assignee_email || m.assignee_id || "",
            };
          });

          const isDynamic =
            execution.current_step_id.startsWith("dynamic_") ||
            (Array.isArray(data._dynamic_chain) &&
              data._dynamic_chain.includes(execution.current_step_id));

          if (isDynamic && Array.isArray(data._dynamic_chain) && data._dynamic_chain.length > 0) {
            steps = data._dynamic_chain.map((role, idx) => ({
              id: `dynamic_step_${idx}`,
              name: `${role.replace(/_/g, " ").toUpperCase()} Approval`,
              step_type: "approval",
              type: "approval",
              metadata: JSON.stringify({ assignee_role: role }),
              approverId: "",
            }));
          }

          const currentStep = steps.find((s) => s.id === execution.current_step_id);
          const parsedMeta = JSON.parse(currentStep?.metadata || "{}");
          const userEmail = req.headers["x-user-email"];
          const userRole = req.headers["x-user-role"];

          res.json({
            executionId: execution.id,
            current_step_id: execution.current_step_id,
            workflowId: execution.workflow_id,
            workflowName: execution.workflow_name,
            currentStep: {
              id: currentStep?.id || "",
              name: currentStep?.name || "",
              type: currentStep?.step_type || "",
              approverId: parsedMeta.assignee_email || parsedMeta.assignee_id || "",
              approverRole: parsedMeta.assignee_role || "",
            },
            status: execution.status,
            approver: parsedMeta.assignee_email || "",
            approver_email: parsedMeta.assignee_email || "",
            steps,
            data,
            logs: JSON.parse(execution.logs || "[]").filter((log) => {
              if (userRole === "admin") return true;
              if (log.approver_id === userEmail) return true;
              if (
                log.metadata &&
                (log.metadata.assignee_email === userEmail ||
                  log.metadata.notification_target === userEmail)
              )
                return true;
              if (log.step_type === "system") return true;
              return false;
            }),
          });
        }
      );
    }
  );
};


exports.getExecutions = (req, res) => {
  db.all(
    `SELECT e.*, w.name as workflow_name FROM executions e
     LEFT JOIN workflows w ON e.workflow_id=w.id ORDER BY e.started_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(
        rows.map((r) => ({
          ...r,
          data: JSON.parse(r.data || "{}"),
          logs: JSON.parse(r.logs || "[]"),
        }))
      );
    }
  );
};

exports.getUserExecutions = async (req, res) => {
  const userRole = req.headers["x-user-role"];
  const userDept = req.headers["x-user-department"];
  const userEmail = req.headers["x-user-email"];

  try {
    const rows = await dbAll(
      `SELECT e.*, w.name as workflow_name FROM executions e
       LEFT JOIN workflows w ON e.workflow_id=w.id ORDER BY e.started_at DESC`,
      []
    );

    const result = [];

    for (const r of rows) {
      if (userRole === "admin") {
        result.push({ ...r, data: JSON.parse(r.data || "{}"), logs: JSON.parse(r.logs || "[]") });
        continue;
      }

      const data = JSON.parse(r.data || "{}");

      // Initiator always sees their own submissions
      if (r.triggered_by === userEmail) {
        result.push({ ...r, data, logs: JSON.parse(r.logs || "[]") });
        continue;
      }
      if (r.status !== "in_progress") continue;
      if (Array.isArray(data._dynamic_chain) && data._dynamic_chain.length > 0) {
        const chain = data._dynamic_chain;
        const idx = data.current_chain_index || 0;
        if (idx >= chain.length) continue;

        const currentRoleNeeded = chain[idx];
        if (currentRoleNeeded !== userRole) continue;

        if (currentRoleNeeded === "department_head" && data.initiator_department !== userDept) {
          continue;
        }

        result.push({ ...r, data, logs: JSON.parse(r.logs || "[]") });
        continue;
      }
      if (r.current_step_id) {
        const step = await dbGet(`SELECT * FROM steps WHERE id=?`, [r.current_step_id]);
        if (!step || step.step_type !== "approval") continue;

        const meta = JSON.parse(step.metadata || "{}");
        const stepRole = meta.assignee_role || null;
        const stepEmail = meta.assignee_email || meta.assignee_id || null;

        const roleMatch = stepRole && stepRole === userRole;
        const emailMatch = stepEmail && stepEmail === userEmail;

        if (!roleMatch && !emailMatch) continue;

        if (roleMatch && stepRole === "department_head" && data.initiator_department !== userDept) {
          continue;
        }

        result.push({ ...r, data, logs: JSON.parse(r.logs || "[]") });
      }
    }

    res.json(result);
  } catch (err) {
    console.error("getUserExecutions error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getPendingApprovals = async (req, res) => {
  const userRole = req.headers["x-user-role"];
  const userDept = req.headers["x-user-department"];
  const userEmail = req.headers["x-user-email"];

  try {
    const rows = await dbAll(
      `SELECT e.*, w.name as workflow_name
       FROM executions e
       LEFT JOIN workflows w ON e.workflow_id = w.id
       WHERE e.status = 'in_progress'`,
      []
    );

    const pendingForUser = [];

    for (const r of rows) {
      const data = JSON.parse(r.data || "{}");

      // ── DYNAMIC CHAIN ──────────────────────────────────────────────────────
      if (Array.isArray(data._dynamic_chain) && data._dynamic_chain.length > 0) {
        const chain = data._dynamic_chain;
        const idx = data.current_chain_index || 0;

        if (idx >= chain.length) continue;

        const currentRoleNeeded = chain[idx];
        if (currentRoleNeeded !== userRole) continue;
        if (currentRoleNeeded === "department_head") {
          if (data.initiator_department !== userDept) continue;
        }

        pendingForUser.push({
          ...r,
          current_step_name: `${currentRoleNeeded.replace(/_/g, " ").toUpperCase()} Approval`,
          data,
          logs: JSON.parse(r.logs || "[]"),
        });
        continue;
      }

      // ── STATIC WORKFLOW ────────────────────────────────────────────────────
      if (r.current_step_id) {
        const step = await dbGet(`SELECT * FROM steps WHERE id=?`, [r.current_step_id]);
        if (!step || step.step_type !== "approval") continue;

        const meta = JSON.parse(step.metadata || "{}");
        const stepRole = meta.assignee_role || null;
        const stepEmail = meta.assignee_email || meta.assignee_id || null;

        const roleMatch = stepRole && stepRole === userRole;
        const emailMatch = stepEmail && stepEmail === userEmail;

        if (!roleMatch && !emailMatch) continue;

        if (roleMatch && stepRole === "department_head") {
          if (data.initiator_department !== userDept) continue;
        }

        pendingForUser.push({
          ...r,
          current_step_name: step.name || "Approval",
          data,
          logs: JSON.parse(r.logs || "[]"),
        });
      }
    }

    res.json(pendingForUser);
  } catch (err) {
    console.error("getPendingApprovals error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.cancelExecution = (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();
  db.run(
    `UPDATE executions SET status='canceled', ended_at=? WHERE id=? AND status='in_progress'`,
    [now, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(400).json({ error: "Cannot cancel: execution not in progress" });
      res.json({ message: "Canceled" });
    }
  );
};


exports.retryExecution = (req, res) => {
  const { id } = req.params;
  db.get(`SELECT * FROM executions WHERE id=?`, [id], (err, execution) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!execution) return res.status(404).json({ error: "Execution not found" });
    if (execution.status !== "failed")
      return res.status(400).json({ error: "Only failed executions can be retried" });

    db.run(
      `UPDATE executions SET status='in_progress', retries=retries+1, ended_at=NULL WHERE id=?`,
      [id],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        runWorkflow(id).catch((e) => console.error("Retry error:", e));
        res.json({ message: "Retrying", executionId: id });
      }
    );
  });
};

exports.approveExecution = (req, res) => {
  const { id } = req.params;
  const { step_id, action, approver_id, comments } = req.body;

  db.get(`SELECT * FROM executions WHERE id=?`, [id], (err, execution) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!execution) return res.status(404).json({ error: "Execution not found" });
    if (execution.status !== "in_progress")
      return res.status(400).json({ error: "Execution is not in progress" });
    if (execution.current_step_id !== step_id)
      return res.status(400).json({ error: "Execution is not currently at this step" });

    const resolvedApproverId =
      approver_id || req.headers["x-user-email"] || "unknown";

    const data = JSON.parse(execution.data || "{}");
    const approvals = data._approvals || {};

    approvals[step_id] = {
      action,
      approver_id: resolvedApproverId,
      comments: comments || "",
      timestamp: new Date().toISOString(),
    };
    data._approvals = approvals;

    db.run(
      `UPDATE executions SET data=? WHERE id=?`,
      [JSON.stringify(data), id],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const logs = JSON.parse(execution.logs || "[]");
        logs.push({
          step_id,
          step_name: "SYSTEM",
          step_type: "system",
          status: "completed",
          error_message: `Human Approval Received: ${action} by ${resolvedApproverId}`,
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          evaluated_rules: [],
          approver_id: resolvedApproverId,
        });

        db.run(`UPDATE executions SET logs=? WHERE id=?`, [JSON.stringify(logs), id], () => {
          runWorkflow(id).catch((e) => console.error("Resume error:", e));
          res.json({ message: "Approval submitted", executionId: id });
        });
      }
    );
  });
};
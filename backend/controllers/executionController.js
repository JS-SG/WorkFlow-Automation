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
            (execution.current_step_id && execution.current_step_id.startsWith("dynamic_")) ||
            (Array.isArray(data._dynamic_chain) &&
              execution.current_step_id &&
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

          res.json({
            ...execution,
            data,
            logs: JSON.parse(execution.logs || "[]"),
            steps,
            currentStep: currentStep || null,
            assignee_role: parsedMeta.assignee_role || null,
            assignee_email: parsedMeta.assignee_email || parsedMeta.assignee_id || null,
          });
        }
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

// ═════════════════════════════════════════════════════════════════════════════
// ✅ FIXED V2: approveExecution - Handles both static and dynamic workflows correctly
// ═════════════════════════════════════════════════════════════════════════════
exports.approveExecution = async (req, res) => {
  const { id } = req.params;
  const { step_id, action, approver_id, comments } = req.body;
 
  try {
    console.log(`[APPROVE] Execution: ${id}, Step: ${step_id}, Action: ${action}`);
    
    const execution = await dbGet(`SELECT * FROM executions WHERE id=?`, [id]);
    
    if (!execution) {
      return res.status(404).json({ error: "Execution not found" });
    }
    
    if (execution.status !== "in_progress") {
      return res.status(400).json({ error: "Execution is not in progress" });
    }
    
    if (!execution.current_step_id) {
      console.log(`[APPROVE ERROR] current_step_id is null`);
      return res.status(400).json({ 
        error: "Execution has no current step defined",
        executionId: id
      });
    }
    
    if (execution.current_step_id !== step_id) {
      console.log(`[APPROVE ERROR] Step mismatch. Current: ${execution.current_step_id}, Provided: ${step_id}`);
      return res.status(400).json({ 
        error: "Execution is not currently at this step",
        current: execution.current_step_id,
        provided: step_id
      });
    }
 
    const resolvedApproverId = approver_id || req.headers["x-user-email"] || "unknown";
    const data = JSON.parse(execution.data || "{}");
    const approvals = data._approvals || {};
 
    approvals[step_id] = {
      action,
      approver_id: resolvedApproverId,
      comments: comments || "",
      timestamp: new Date().toISOString(),
    };
    data._approvals = approvals;
 
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
 
    let nextStepId = null;
    let executionStatus = "in_progress";
    let endedAt = null;
 
    // ═══════════════════════════════════════════════════════════════════
    // HANDLE REJECTION - Move to "Task Rejection" notification step
    // ═══════════════════════════════════════════════════════════════════
    if (action === "rejected") {
      console.log(`[APPROVE] 🚫 REJECTION at step ${step_id}`);
      
      // ── DYNAMIC CHAIN REJECTION ─────────────────────────────────────
      if (Array.isArray(data._dynamic_chain) && data._dynamic_chain.length > 0) {
        // No notification steps in dynamic workflows - mark as failed immediately
        executionStatus = "failed";
        endedAt = new Date().toISOString();
        nextStepId = "workflow_rejected";
        console.log(`[APPROVE] Dynamic workflow rejected - no notification step`);
      }
      // ── STATIC WORKFLOW REJECTION ───────────────────────────────────
      else {
        const allSteps = await dbAll(
          `SELECT * FROM steps WHERE workflow_id=? ORDER BY step_order ASC`,
          [execution.workflow_id]
        );
        
        console.log(`[APPROVE] 🔍 Looking for rejection notification step`);
        console.log(`[APPROVE] All steps: ${allSteps.map(s => `${s.name}:${s.step_type}`).join(', ')}`);
        
        // Find "Task Rejection" notification step
        const rejectionStep = allSteps.find(s => {
          const isNotification = s.step_type === "notification";
          const hasRejectionName = s.name.toLowerCase().includes("reject") || s.name.toLowerCase().includes("rejected") || 
                                   s.name.toLowerCase().includes("rejection") || s.name.toLowerCase().includes("task rejection") &&
                                   !s.name.toLowerCase().includes("approve");
          console.log(`[APPROVE] Checking ${s.name}: notification=${isNotification}, hasReject=${hasRejectionName}`);
          return isNotification && hasRejectionName;
        });
        
        if (rejectionStep) {
          // ✅ MOVE TO REJECTION NOTIFICATION STEP
          nextStepId = rejectionStep.id;
          executionStatus = "in_progress";
          console.log(`[APPROVE] ✅ Moving to rejection notification: ${rejectionStep.name} (${rejectionStep.id})`);
          
          // WorkflowRunner will send email and then mark as failed
        } else {
          // No rejection notification step found
          executionStatus = "failed";
          endedAt = new Date().toISOString();
          nextStepId = execution.current_step_id;
          console.log(`[APPROVE] ⚠️  No rejection notification found - marking as failed immediately`);
        }
      }
    } 
    // ═══════════════════════════════════════════════════════════════════
    // HANDLE APPROVAL - Check if more approvals needed, then move to notification
    // ═══════════════════════════════════════════════════════════════════
    else if (action === "approved") {
      // ── DYNAMIC CHAIN WORKFLOW ──────────────────────────────────────
      if (Array.isArray(data._dynamic_chain) && data._dynamic_chain.length > 0) {
        const currentIndex = data.current_chain_index || 0;
        const nextIndex = currentIndex + 1;
        
        console.log(`[APPROVE] Dynamic chain: ${JSON.stringify(data._dynamic_chain)}`);
        console.log(`[APPROVE] Current index: ${currentIndex}, Next index: ${nextIndex}`);
        
        if (nextIndex < data._dynamic_chain.length) {
          // More approvals needed
          data.current_chain_index = nextIndex;
          nextStepId = `dynamic_step_${nextIndex}`;
          executionStatus = "in_progress";
          console.log(`[APPROVE] ➡️  Moving to next approval: ${nextStepId} (${data._dynamic_chain[nextIndex]})`);
        } else {
          // All approvals complete - no notification in dynamic workflows
          nextStepId = "dynamic_completed";
          executionStatus = "completed";
          endedAt = new Date().toISOString();
          console.log(`[APPROVE] ✅ All dynamic approvals complete`);
        }
      }
      // ── STATIC WORKFLOW ─────────────────────────────────────────────
      else {
        console.log(`[APPROVE] Static workflow - checking for next steps`);
        
        const allSteps = await dbAll(
          `SELECT * FROM steps WHERE workflow_id=? ORDER BY step_order ASC`,
          [execution.workflow_id]
        );
        
        console.log(`[APPROVE] Total steps: ${allSteps.length}`);
        console.log(`[APPROVE] All steps: ${allSteps.map(s => `${s.name}:${s.step_type}`).join(', ')}`);
        
        const currentStepIndex = allSteps.findIndex(s => s.id === step_id);
        
        if (currentStepIndex === -1) {
          throw new Error("Current step not found in workflow");
        }
        
        console.log(`[APPROVE] Current step index: ${currentStepIndex} (${allSteps[currentStepIndex].name})`);
        
        // Look for next APPROVAL step FIRST
        let foundNextApproval = false;
        for (let i = currentStepIndex + 1; i < allSteps.length; i++) {
          const candidateStep = allSteps[i];
          console.log(`[APPROVE] Checking step ${i}: ${candidateStep.name} (type: ${candidateStep.step_type})`);
          
          if (candidateStep.step_type === "approval") {
            nextStepId = candidateStep.id;
            executionStatus = "in_progress";
            foundNextApproval = true;
            console.log(`[APPROVE] ➡️  Found next approval step: ${nextStepId} (${candidateStep.name})`);
            break;
          }
        }
        
        // If no more APPROVAL steps, look for "Task Approval" NOTIFICATION step
        if (!foundNextApproval) {
          console.log(`[APPROVE] 🔍 No more approval steps - looking for approval notification`);
          
          // Find "Task Approval" notification step
          const approvalNotificationStep = allSteps.find(s => {
            const isNotification = s.step_type === "notification";
            const hasApprovalName = (s.name.toLowerCase().includes("approval") || 
                                    s.name.toLowerCase().includes("approved") ||
                                    s.name.toLowerCase().includes("task approval")) &&
                                   !s.name.toLowerCase().includes("reject");
            console.log(`[APPROVE] Checking ${s.name}: notification=${isNotification}, hasApproval=${hasApprovalName}`);
            return isNotification && hasApprovalName;
          });
          
          if (approvalNotificationStep) {
            // ✅ MOVE TO APPROVAL NOTIFICATION STEP
            nextStepId = approvalNotificationStep.id;
            executionStatus = "in_progress";
            console.log(`[APPROVE] ✅ Moving to approval notification: ${approvalNotificationStep.name} (${approvalNotificationStep.id})`);
            
            // WorkflowRunner will send email and then mark as completed
          } else {
            // No notification step - mark as completed immediately
            nextStepId = "workflow_completed";
            executionStatus = "completed";
            endedAt = new Date().toISOString();
            console.log(`[APPROVE] ⚠️  No approval notification found - marking as completed immediately`);
          }
        }
      }
    } else {
      console.log(`[APPROVE ERROR] Invalid action: ${action}`);
      return res.status(400).json({ error: "Invalid action. Must be 'approve' or 'reject'" });
    }
 
    console.log(`[APPROVE] 📊 Final state - nextStepId: ${nextStepId}, status: ${executionStatus}`);
 
    // ═══════════════════════════════════════════════════════════════════
    // UPDATE DATABASE
    // ═══════════════════════════════════════════════════════════════════
    await dbRun(
      `UPDATE executions 
       SET data=?, 
           logs=?, 
           current_step_id=?, 
           status=?,
           ended_at=?
       WHERE id=?`,
      [
        JSON.stringify(data), 
        JSON.stringify(logs), 
        nextStepId,
        executionStatus,
        endedAt,
        id
      ]
    );
 
    console.log(`[APPROVE] ✅ Database updated successfully`);
 
    // Trigger workflowRunner for notification steps or next approval
    if (executionStatus === "in_progress") {
      console.log(`[APPROVE] 🔄 Calling runWorkflow to continue (will send email if notification step)`);
      runWorkflow(id).catch((e) => console.error("Resume error:", e));
    }
 
    // Notify next approver if moving to another approval step (not notification)
    if (executionStatus === "in_progress" && nextStepId && !nextStepId.includes("workflow")) {
      try {
        // Check if next step is an approval (not notification)
        const nextStep = await dbGet(`SELECT * FROM steps WHERE id=?`, [nextStepId]);
        
        if (nextStep && nextStep.step_type === "approval") {
          if (data._dynamic_chain) {
            const nextRole = data._dynamic_chain[data.current_chain_index];
            console.log(`[APPROVE] 📧 Notifying next approver role: ${nextRole}`);
            await createNotification({
              execution_id: id,
              user_role: nextRole,
              message: `New approval request: ${nextRole.replace(/_/g, " ").toUpperCase()}`,
              type: "approval_required"
            });
          } else {
            const meta = JSON.parse(nextStep.metadata || "{}");
            if (meta.assignee_email) {
              console.log(`[APPROVE] 📧 Notifying next approver: ${meta.assignee_email}`);
              await createNotification({
                execution_id: id,
                user_email: meta.assignee_email,
                message: `New approval request: ${nextStep.name}`,
                type: "approval_required"
              });
            }
          }
        } else if (nextStep && nextStep.step_type === "notification") {
          console.log(`[APPROVE] ✉️  Next step is notification - workflowRunner will handle email`);
        }
      } catch (notifError) {
        console.error("Notification error:", notifError);
      }
    }
 
    console.log(`[APPROVE] ✅ Success! Returning response`);
 
    res.json({ 
      message: "Approval submitted", 
      executionId: id,
      status: executionStatus,
      nextStep: nextStepId
    });
 
  } catch (err) {
    console.error("approveExecution error:", err);
    return res.status(500).json({ error: err.message });
  }
};

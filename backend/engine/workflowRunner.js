const db = require("../config/db");
const evaluateRule = require("./ruleEngine");
const { createNotification } = require("../controllers/notificationController");

const MAX_LOOP_ITERATIONS = 50;


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


async function appendLog(executionId, logEntry) {
  const exec = await dbGet(`SELECT logs FROM executions WHERE id=?`, [executionId]);
  const logs = JSON.parse(exec.logs || "[]");
  logs.push(logEntry);
  await dbRun(`UPDATE executions SET logs=? WHERE id=?`, [JSON.stringify(logs), executionId]);
}


async function resolveRecipientEmail(role, departmentId) {
  if (!role) return "";

  if (role === "department_head" && departmentId) {
    const dept = await dbGet(`SELECT head_id FROM departments WHERE id=?`, [departmentId]);
    if (dept && dept.head_id) {
      const head = await dbGet(`SELECT email FROM users WHERE id=?`, [dept.head_id]);
      return head ? head.email : "";
    }
  }

  const user = await dbGet(`SELECT email FROM users WHERE role=? LIMIT 1`, [role]);
  return user ? user.email : "";
}

async function notifyStepEvent({ executionId, workflowId, workflowName, step, status, data }) {
  const meta = JSON.parse(step.metadata || "{}");

  const execution = await dbGet(`SELECT triggered_by, data FROM executions WHERE id=?`, [executionId]);
  const initiatorEmail = execution ? execution.triggered_by : "";
  const executionData = JSON.parse(execution?.data || "{}");
  const initiatorDept = executionData.initiator_department;

  let recipientEmail = meta.assignee_email || meta.notification_target || "";

  if (!recipientEmail && meta.assignee_role) {
    recipientEmail = await resolveRecipientEmail(meta.assignee_role, initiatorDept);
  }

  let message = "";
  let eventType = "";

  if (status === "completed") {
    if (step.step_type === "notification") {
      eventType = "NOTIFICATION_SENT";
      const channel = meta.notification_channel || "dashboard";
      message = `🔔 Notification step "${step.name}" executed via ${channel} in workflow "${workflowName}".`;
    } else if (step.step_type === "task") {
      eventType = "TASK_COMPLETED";
      message = `⚙️ Task step "${step.name}" completed in workflow "${workflowName}".`;
    }
  } else if (status === "pending_approval") {
    eventType = "workflow_approval";
    message = `⏳ Step "${step.name}" requires your approval in workflow "${workflowName}".`;
  } else if (status === "approval_approved") {
    eventType = "APPROVAL_APPROVED";
    message = `✅ Step "${step.name}" was approved in workflow "${workflowName}".`;
  } else if (status === "approval_rejected") {
    eventType = "APPROVAL_REJECTED";
    message = `❌ Step "${step.name}" was rejected in workflow "${workflowName}".`;
  } else if (status === "failed") {
    eventType = "STEP_FAILED";
    message = `❌ Step "${step.name}" failed in workflow "${workflowName}". Check the audit log for details.`;
  }

  if (!eventType) return;

  if (recipientEmail) {
    createNotification({
      executionId, workflowId, workflowName,
      stepId: step.id, stepName: step.name, stepType: step.step_type,
      eventType, message, recipientEmail,
    });
  }

  if (initiatorEmail && initiatorEmail !== recipientEmail) {
    createNotification({
      executionId, workflowId, workflowName,
      stepId: step.id, stepName: step.name, stepType: step.step_type,
      eventType: `TRACKER_${eventType}`,
      message: `Tracker: ${message}`,
      recipientEmail: initiatorEmail,
    });
  }

  if (!recipientEmail && !initiatorEmail) {
    createNotification({
      executionId, workflowId, workflowName,
      stepId: step.id, stepName: step.name, stepType: step.step_type,
      eventType, message, recipientEmail: "",
    });
  }
}

async function runWorkflow(executionId) {
  let iterations = 0;

  const execution0 = await dbGet(`SELECT * FROM executions WHERE id=?`, [executionId]);
  const wfRow = await dbGet(`SELECT name FROM workflows WHERE id=?`, [execution0.workflow_id]);
  const workflowName = wfRow ? wfRow.name : "Unknown Workflow";

  while (iterations < MAX_LOOP_ITERATIONS) {
    iterations++;

    const execution = await dbGet(`SELECT * FROM executions WHERE id=?`, [executionId]);
    if (!execution) throw new Error("Execution not found");
    if (["canceled", "completed", "failed"].includes(execution.status)) return;

    const data = JSON.parse(execution.data || "{}");
    const isDynamic =
      Array.isArray(data._dynamic_chain) && data._dynamic_chain.length > 0;

    let step;
    let rules = [];
    if (isDynamic) {
      const chain = data._dynamic_chain;
      const idx = data.current_chain_index || 0;
      if (idx >= chain.length) {
        await dbRun(
          `UPDATE executions SET status='completed', ended_at=?, current_step_id='dynamic_completed' WHERE id=?`,
          [new Date().toISOString(), executionId]
        );

        const initiatorExec = await dbGet(
          `SELECT triggered_by FROM executions WHERE id=?`,
          [executionId]
        );
        const initiatorEmail = initiatorExec ? initiatorExec.triggered_by : "";

        createNotification({
          executionId,
          workflowId: execution.workflow_id,
          workflowName,
          stepId: "dynamic_finish",
          stepName: "Workflow Finish",
          stepType: "system",
          eventType: "WORKFLOW_COMPLETED",
          message: `✅ Dynamic Workflow "${workflowName}" completed successfully.`,
          recipientEmail: initiatorEmail,
        });
        return;
      }

      const neededRole = chain[idx];
      step = {
        id: `dynamic_step_${idx}`,
        name: `${neededRole.replace(/_/g, " ").toUpperCase()} Approval`,
        step_type: "approval",
        metadata: JSON.stringify({ assignee_role: neededRole }),
      };

    } else {
      step = await dbGet(`SELECT * FROM steps WHERE id=?`, [execution.current_step_id]);

      if (!step) {
        await dbRun(
          `UPDATE executions SET status='failed', ended_at=? WHERE id=?`,
          [new Date().toISOString(), executionId]
        );
        return;
      }
      rules = await dbAll(
        `SELECT * FROM rules WHERE step_id=? ORDER BY priority ASC`,
        [step.id]
      );
    }
    if (step.step_type === "approval") {
      const approvals = data._approvals || {};
      const stepApproval = approvals[step.id];

      if (!stepApproval || (!stepApproval.action)) {
        if (!stepApproval) {
          approvals[step.id] = { status: "pending", initiated_at: new Date().toISOString() };
          data._approvals = approvals;
          await dbRun(
            `UPDATE executions SET data=? WHERE id=?`,
            [JSON.stringify(data), executionId]
          );

          await notifyStepEvent({
            executionId,
            workflowId: execution.workflow_id,
            workflowName,
            step,
            status: "pending_approval",
            data,
          });
        }
        return;
      }
      data["approval_action"] = stepApproval.action;
      data["Approval Action"] = stepApproval.action;

      const stepStarted = new Date().toISOString();

      if (isDynamic) {
        if (stepApproval.action === "approved") {
          const newIdx = (data.current_chain_index || 0) + 1;
          data.current_chain_index = newIdx;

          const isLastStep = newIdx >= data._dynamic_chain.length;
          const nextStepId = isLastStep ? "dynamic_completed" : `dynamic_step_${newIdx}`;
          await dbRun(
            `UPDATE executions SET data=?, current_step_id=? WHERE id=?`,
            [JSON.stringify(data), nextStepId, executionId]
          );

          await appendLog(executionId, {
            step_id: step.id,
            step_name: step.name,
            step_type: step.step_type,
            evaluated_rules: [
              { rule_id: "dynamic", condition: "action === 'approved'", result: true, error: null },
            ],
            selected_next_step: nextStepId,
            status: "completed",
            started_at: stepStarted,
            ended_at: new Date().toISOString(),
            metadata: JSON.parse(step.metadata || "{}"),
            error_message: null,
            approver_id: stepApproval.approver_id,
          });

          await notifyStepEvent({
            executionId,
            workflowId: execution.workflow_id,
            workflowName,
            step,
            status: "approval_approved",
            data,
          });
          continue;

        } else if (stepApproval.action === "rejected") {
          await dbRun(
            `UPDATE executions SET status='failed', ended_at=? WHERE id=?`,
            [new Date().toISOString(), executionId]
          );

          await appendLog(executionId, {
            step_id: step.id,
            step_name: step.name,
            step_type: step.step_type,
            evaluated_rules: [
              { rule_id: "dynamic", condition: "action === 'rejected'", result: true, error: null },
            ],
            selected_next_step: null,
            status: "failed",
            started_at: stepStarted,
            ended_at: new Date().toISOString(),
            metadata: JSON.parse(step.metadata || "{}"),
            error_message: `Rejected by ${stepApproval.approver_id}`,
            approver_id: stepApproval.approver_id,
          });

          await notifyStepEvent({
            executionId,
            workflowId: execution.workflow_id,
            workflowName,
            step,
            status: "approval_rejected",
            data,
          });

          return;

        } else {
          await dbRun(
            `UPDATE executions SET status='failed', ended_at=? WHERE id=?`,
            [new Date().toISOString(), executionId]
          );
          return;
        }
      }
    }
    const stepStarted = new Date().toISOString();
    const evaluatedRules = [];
    let matchedRule = null;
    let nextStepId = null;

    for (const rule of rules) {
      let result = false;
      let error = null;
      try {
        result = evaluateRule(rule.condition, data);
      } catch (e) {
        error = e.message;
      }
      evaluatedRules.push({ rule_id: rule.id, condition: rule.condition, result, error: error || null });
      if (result && !matchedRule) matchedRule = rule;
    }

    if (matchedRule) {
      nextStepId = matchedRule.next_step_id;
    }

    const stepEnded = new Date().toISOString();
    const approvals = data._approvals || {};
    const stepApproval = approvals[step.id];

    const logEntry = {
      step_id: step.id,
      step_name: step.name,
      step_type: step.step_type,
      evaluated_rules: evaluatedRules,
      selected_next_step: matchedRule ? matchedRule.next_step_id : null,
      status: matchedRule ? "completed" : "failed",
      started_at: stepStarted,
      ended_at: stepEnded,
      metadata: JSON.parse(step.metadata || "{}"),
      error_message: matchedRule ? null : `No matching rule found for step: ${step.name}`,
    };

    if (stepApproval?.approver_id) {
      logEntry.approver_id = stepApproval.approver_id;
    }

    await appendLog(executionId, logEntry);
    if (step.step_type === "approval" && logEntry.status === "completed") {
      await notifyStepEvent({
        executionId,
        workflowId: execution.workflow_id,
        workflowName,
        step,
        status: stepApproval?.action === "rejected" ? "approval_rejected" : "approval_approved",
        data,
      });
    } else if (step.step_type !== "approval" || logEntry.status === "failed") {
      await notifyStepEvent({
        executionId,
        workflowId: execution.workflow_id,
        workflowName,
        step,
        status: logEntry.status,
        data,
      });
    }

    if (!matchedRule) {
      await dbRun(
        `UPDATE executions SET status='failed', ended_at=? WHERE id=?`,
        [stepEnded, executionId]
      );

      const initiatorExec = await dbGet(
        `SELECT triggered_by FROM executions WHERE id=?`,
        [executionId]
      );
      createNotification({
        executionId,
        workflowId: execution.workflow_id,
        workflowName,
        stepId: step.id,
        stepName: step.name,
        stepType: step.step_type,
        eventType: "WORKFLOW_FAILED",
        message: `❌ Workflow "${workflowName}" failed at step "${step.name}". No rule matched.`,
        recipientEmail: initiatorExec ? initiatorExec.triggered_by : "",
      });
      return;
    }

    if (!matchedRule.next_step_id || matchedRule.next_step_id === "") {
      await dbRun(
        `UPDATE executions SET status='completed', ended_at=? WHERE id=?`,
        [stepEnded, executionId]
      );

      const initiatorExec = await dbGet(
        `SELECT triggered_by FROM executions WHERE id=?`,
        [executionId]
      );
      createNotification({
        executionId,
        workflowId: execution.workflow_id,
        workflowName,
        stepId: step.id,
        stepName: step.name,
        stepType: step.step_type,
        eventType: "WORKFLOW_COMPLETED",
        message: `✅ Workflow "${workflowName}" completed successfully after step "${step.name}".`,
        recipientEmail: initiatorExec ? initiatorExec.triggered_by : "",
      });
      return;
    }

    // Advance to the next step – this is the key visibility update:
    // after this, only the new step's assigned approver will see the execution.
    await dbRun(
      `UPDATE executions SET current_step_id=? WHERE id=?`,
      [nextStepId, executionId]
    );
  }

  // Max iterations guard
  const now = new Date().toISOString();
  await appendLog(executionId, {
    step_name: "SYSTEM",
    step_type: "system",
    status: "failed",
    error_message: `Max loop iterations (${MAX_LOOP_ITERATIONS}) reached. Possible infinite loop.`,
    started_at: now,
    ended_at: now,
    evaluated_rules: [],
  });
  await dbRun(
    `UPDATE executions SET status='failed', ended_at=? WHERE id=?`,
    [now, executionId]
  );
}

module.exports = runWorkflow;
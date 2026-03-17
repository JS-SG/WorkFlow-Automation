const { v4: uuidv4 } = require("uuid");
const db = require("../config/db");
const { sendEmail } = require("../utils/email");

/**
 * Create a notification for a step event.
 * @param {object} opts
 */
function createNotification({ executionId, workflowId, workflowName, stepId, stepName, stepType, eventType, message, recipientEmail }) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO notifications VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, executionId, workflowId, workflowName || "", stepId, stepName, stepType, eventType, message, recipientEmail || "", 0, now],
    (err) => { if (err) console.error("Notification insert error:", err.message); }
  );
  if (recipientEmail && recipientEmail.includes("@")) {
    sendEmail(recipientEmail, `Workflow: ${eventType}`, message);
  }
  console.log(`\n===========================================`);
  console.log(`📬 EMAIL NOTIFICATION SIMULATION`);
  console.log(`===========================================`);
  console.log(`TO:         ${recipientEmail || "System Dashboard (Global)"}`);
  console.log(`EVENT:      ${eventType}`);
  console.log(`DATE:       ${now}`);
  console.log(`-------------------------------------------`);
  console.log(`Workflow:   ${workflowName}`);
  console.log(`Request ID: ${executionId}`);
  console.log(`Step:       ${stepName}`);
  console.log(`Action:     ${eventType.replace(/_/g, " ")}`);
  console.log(`Message:    ${message}`);
  console.log(`===========================================\n`);
  return id;
}

exports.getNotifications = (req, res) => {
  const { unread_only } = req.query;
  const userEmail = req.headers["x-user-email"];
  const userRole = req.headers["x-user-role"];
  let query = `SELECT * FROM notifications`;
  let conditions = [];
  let params = [];

  if (userRole !== "admin") {
    conditions.push(`recipient_email = ?`);
    params.push(userEmail);
  }

  if (unread_only === "true") {
    conditions.push(`is_read = 0`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(" AND ");
  }

  query += ` ORDER BY created_at DESC LIMIT 50`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    let countQuery = `SELECT COUNT(*) as count FROM notifications WHERE is_read=0`;
    let countParams = [];
    if (userRole !== "admin") {
       countQuery += ` AND recipient_email=?`;
       countParams.push(userEmail);
    }

    db.get(countQuery, countParams, (e, r) => {
      res.json({ notifications: rows, unread_count: r ? r.count : 0 });
    });
  });
};

exports.markRead = (req, res) => {
  const { id } = req.params;
  const query = id === "all"
    ? `UPDATE notifications SET is_read=1`
    : `UPDATE notifications SET is_read=1 WHERE id=?`;
  const params = id === "all" ? [] : [id];
  db.run(query, params, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Marked as read" });
  });
};

exports.createNotification = createNotification;

const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.createRule = (req, res) => {
  const id = uuidv4();
  const { step_id, condition, next_step_id, priority } = req.body;
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO rules VALUES(?,?,?,?,?,?,?)`,
    [id, step_id, condition, next_step_id || null, priority || 1, now, now],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id, step_id, condition, next_step_id, priority });
    }
  );
};

exports.getRules = (req, res) => {
  const { step_id } = req.params;
  db.all(`SELECT * FROM rules WHERE step_id=? ORDER BY priority ASC`, [step_id], (err, rules) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rules);
  });
};

exports.updateRule = (req, res) => {
  const { id } = req.params;
  const { condition, next_step_id, priority } = req.body;
  const now = new Date().toISOString();

  db.get(`SELECT * FROM rules WHERE id=?`, [id], (err, rule) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rule) return res.status(404).json({ error: "Rule not found" });

    db.run(
      `UPDATE rules SET condition=?, next_step_id=?, priority=?, updated_at=? WHERE id=?`,
      [
        condition !== undefined ? condition : rule.condition,
        next_step_id !== undefined ? next_step_id : rule.next_step_id,
        priority !== undefined ? priority : rule.priority,
        now,
        id,
      ],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ id, message: "Updated" });
      }
    );
  });
};

exports.deleteRule = (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM rules WHERE id=?`, [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted" });
  });
};
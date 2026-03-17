const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.createStep = (req, res) => {
  const id = uuidv4();
  const { workflow_id, name, step_type, metadata } = req.body;
  const now = new Date().toISOString();

  // auto-compute order
  db.get(`SELECT MAX(step_order) as maxOrder FROM steps WHERE workflow_id=?`, [workflow_id], (err, row) => {
    const order = (row && row.maxOrder !== null ? row.maxOrder : 0) + 1;
    db.run(
      `INSERT INTO steps VALUES(?,?,?,?,?,?,?,?)`,
      [id, workflow_id, name, step_type, order, JSON.stringify(metadata || {}), now, now],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        // Set as start_step_id if it's the first step
        db.get(`SELECT COUNT(*) as c FROM steps WHERE workflow_id=?`, [workflow_id], (e, r) => {
          if (r && r.c === 1) {
            db.run(`UPDATE workflows SET start_step_id=? WHERE id=?`, [id, workflow_id]);
          }
        });
        res.json({ id, name, step_type, order, workflow_id });
      }
    );
  });
};

exports.getSteps = (req, res) => {
  const { workflow_id } = req.params;
  db.all(`SELECT * FROM steps WHERE workflow_id=? ORDER BY step_order ASC`, [workflow_id], (err, steps) => {
    if (err) return res.status(500).json({ error: err.message });
    const result = steps.map((s) => ({ ...s, metadata: JSON.parse(s.metadata || "{}") }));
    res.json(result);
  });
};

exports.updateStep = (req, res) => {
  const { id } = req.params;
  const { name, step_type, step_order, metadata } = req.body;
  const now = new Date().toISOString();

  db.get(`SELECT * FROM steps WHERE id=?`, [id], (err, step) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!step) return res.status(404).json({ error: "Step not found" });

    db.run(
      `UPDATE steps SET name=?, step_type=?, step_order=?, metadata=?, updated_at=? WHERE id=?`,
      [
        name || step.name,
        step_type || step.step_type,
        step_order !== undefined ? step_order : step.step_order,
        JSON.stringify(metadata !== undefined ? metadata : JSON.parse(step.metadata || "{}")),
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

exports.deleteStep = (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM rules WHERE step_id=?`, [id], () => {
    db.run(`DELETE FROM steps WHERE id=?`, [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Deleted" });
    });
  });
};
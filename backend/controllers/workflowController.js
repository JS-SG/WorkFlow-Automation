const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.createWorkflow = (req, res) => {
  const id = uuidv4();
  const { name, description, category, input_schema } = req.body;
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO workflows (id, name, description, category, version, is_active, input_schema, start_step_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, name, description || "", category || "General", 1, 1, JSON.stringify(input_schema || {}), null, now, now],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id, name, category: category || "General", version: 1, is_active: 1 });
    }
  );
};

exports.getWorkflows = (req, res) => {
  const { search, status, category, page = 1, limit = 20 } = req.query;
  const userRole = req.headers["x-user-role"];

  const offset = (page - 1) * limit;

  let query = `SELECT * FROM workflows`;
  const params = [];
  const conditions = [];
  if (userRole !== "admin") {
    conditions.push(`is_active = 1`);
  }

  if (search) {
    conditions.push(`name LIKE ?`);
    params.push(`%${search}%`);
  }

  if (status === "active") {
    conditions.push(`is_active = 1`);
  } else if (status === "inactive") {
    conditions.push(`is_active = 0`);
  }

  if (category) {
    conditions.push(`category = ?`);
    params.push(category);
  }

  if (conditions.length) query += ` WHERE ` + conditions.join(" AND ");

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;

  params.push(Number(limit), Number(offset));

  db.all(query, params, (err, rows) => {
    let countQuery = `SELECT COUNT(*) as total FROM workflows`;
    if (conditions.length) countQuery += ` WHERE ` + conditions.join(" AND ");
    
    db.get(countQuery, params.slice(0, -2), (err2, countRow) => {
      const enriched = rows.map((w) => ({
        ...w,
        input_schema: JSON.parse(w.input_schema || "{}"),
      }));
      
      if (enriched.length === 0) return res.json({ workflows: [], total: 0 });

      let done = 0;
      enriched.forEach((w, i) => {
        db.get(`SELECT COUNT(*) as cnt FROM steps WHERE workflow_id=?`, [w.id], (e, r) => {
          enriched[i].step_count = r ? r.cnt : 0;
          done++;
          if (done === enriched.length) {
            res.json({ workflows: enriched, total: countRow ? countRow.total : enriched.length });
          }
        });
      });
    });
  });
};

exports.getUserWorkflows = exports.getWorkflows;

exports.getWorkflow = (req, res) => {
  const { id } = req.params;
  db.get(`SELECT * FROM workflows WHERE id=?`, [id], (err, workflow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!workflow) return res.status(404).json({ error: "Workflow not found" });

    workflow.input_schema = JSON.parse(workflow.input_schema || "{}");

    db.all(`SELECT * FROM steps WHERE workflow_id=? ORDER BY step_order ASC`, [id], (err2, steps) => {
      if (err2) return res.status(500).json({ error: err2.message });

      let stepsProcessed = 0;
      if (steps.length === 0) return res.json({ ...workflow, steps: [] });

      steps.forEach((step, i) => {
        step.metadata = JSON.parse(step.metadata || "{}");
        db.all(`SELECT * FROM rules WHERE step_id=? ORDER BY priority ASC`, [step.id], (err3, rules) => {
          steps[i].rules = rules || [];
          stepsProcessed++;
          if (stepsProcessed === steps.length) {
            res.json({ ...workflow, steps });
          }
        });
      });
    });
  });
};

exports.updateWorkflow = (req, res) => {
  const { id } = req.params;
  const { name, description, category, input_schema, is_active, start_step_id } = req.body;
  const now = new Date().toISOString();

  db.get(`SELECT * FROM workflows WHERE id=?`, [id], (err, workflow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!workflow) return res.status(404).json({ error: "Workflow not found" });

    const newVersion = (workflow.version || 1) + 1;
    db.run(
      `UPDATE workflows SET name=?, description=?, category=?, version=?, is_active=?, input_schema=?, start_step_id=?, updated_at=? WHERE id=?`,
      [
        name || workflow.name,
        description !== undefined ? description : workflow.description,
        category !== undefined ? category : workflow.category,
        newVersion,
        is_active !== undefined ? is_active : workflow.is_active,
        JSON.stringify(input_schema || JSON.parse(workflow.input_schema || "{}")),
        start_step_id || workflow.start_step_id,
        now,
        id,
      ],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ id, version: newVersion, message: "Updated" });
      }
    );
  });
};

exports.deleteWorkflow = (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM rules WHERE step_id IN (SELECT id FROM steps WHERE workflow_id=?)`, [id], () => {
    db.run(`DELETE FROM steps WHERE workflow_id=?`, [id], () => {
      db.run(`DELETE FROM workflows WHERE id=?`, [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted" });
      });
    });
  });
};

exports.setStartStep = (req, res) => {
  const { id } = req.params;
  const { start_step_id } = req.body;
  db.run(`UPDATE workflows SET start_step_id=? WHERE id=?`, [start_step_id, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Start step updated" });
  });
};
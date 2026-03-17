const db = require("../config/db");

db.serialize(() => {

  db.run(`CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'General',
    version INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    input_schema TEXT DEFAULT '{}',
    start_step_id TEXT,
    created_at TEXT,
    updated_at TEXT
  )`);

  db.run(`ALTER TABLE workflows ADD COLUMN description TEXT DEFAULT ''`, () => {});
  db.run(`ALTER TABLE workflows ADD COLUMN category TEXT DEFAULT 'General'`, () => {});
  db.run(`ALTER TABLE workflows ADD COLUMN updated_at TEXT`, () => {});

  db.run(`CREATE TABLE IF NOT EXISTS steps (
    id TEXT PRIMARY KEY,
    workflow_id TEXT,
    name TEXT,
    step_type TEXT,
    step_order INTEGER DEFAULT 1,
    metadata TEXT DEFAULT '{}',
    created_at TEXT,
    updated_at TEXT
  )`);

  db.run(`ALTER TABLE steps ADD COLUMN created_at TEXT`, () => {});
  db.run(`ALTER TABLE steps ADD COLUMN updated_at TEXT`, () => {});

  db.run(`CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    step_id TEXT,
    condition TEXT,
    next_step_id TEXT,
    priority INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT
  )`);

  db.run(`ALTER TABLE rules ADD COLUMN created_at TEXT`, () => {});
  db.run(`ALTER TABLE rules ADD COLUMN updated_at TEXT`, () => {});

  db.run(`CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT,
    workflow_version INTEGER,
    status TEXT,
    data TEXT DEFAULT '{}',
    logs TEXT DEFAULT '[]',
    current_step_id TEXT,
    retries INTEGER DEFAULT 0,
    triggered_by TEXT,
    started_at TEXT,
    ended_at TEXT
  )`);

  db.run(`ALTER TABLE executions ADD COLUMN logs TEXT DEFAULT '[]'`, () => {});
  db.run(`ALTER TABLE executions ADD COLUMN triggered_by TEXT`, () => {});
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    execution_id TEXT,
    workflow_id TEXT,
    workflow_name TEXT,
    step_id TEXT,
    step_name TEXT,
    step_type TEXT,
    event_type TEXT,
    message TEXT,
    recipient_email TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT,
    head_id TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    role TEXT,
    department_id TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS approval_chains (
    initiator_role TEXT PRIMARY KEY,
    chain TEXT
  )`);
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (row && row.count === 0) {
      const seedUsers = [
        { id: "employee-001", name: "Employee 1", email: "emp1@example.com", role: "employee", dept: "dept_it" },
        { id: "employee-002", name: "Employee 2", email: "emp2@example.com", role: "employee", dept: "dept_support" },
        { id: "employee-003", name: "Employee 3", email: "emp3@example.com", role: "employee", dept: "dept_sales" },
        { id: "dept_head_it", name: "IT Department Head", email: "head_it@example.com", role: "department_head", dept: "dept_it" },
        { id: "dept_head_support", name: "Support Department Head", email: "head_support@example.com", role: "department_head", dept: "dept_support" },
        { id: "dept_head_sales", name: "Sales Department Head", email: "head_sales@example.com", role: "department_head", dept: "dept_sales" },
        { id: "hr-001", name: "HR Manager", email: "hr@example.com", role: "hr", dept: null },
        { id: "manager-001", name: "General Manager", email: "manager@example.com", role: "manager", dept: null },
        { id: "ceo-001", name: "Chief Executive Officer", email: "ceo@example.com", role: "ceo", dept: null },
        { id: "admin-001", name: "Alice Admin", email: "admin@example.com", role: "admin", dept: null },
      ];
      
      const insertUser = db.prepare(`INSERT INTO users (id, name, email, role, department_id) VALUES (?, ?, ?, ?, ?)`);
      seedUsers.forEach(u => insertUser.run(u.id, u.name, u.email, u.role, u.dept));
      insertUser.finalize();
      const seedDepts = [
        { id: "dept_it", name: "IT Department", head: "dept_head_it" },
        { id: "dept_support", name: "Customer Support Department", head: "dept_head_support" },
        { id: "dept_sales", name: "Sales Department", head: "dept_head_sales" }
      ];
      const insertDept = db.prepare(`INSERT INTO departments (id, name, head_id) VALUES (?, ?, ?)`);
      seedDepts.forEach(d => insertDept.run(d.id, d.name, d.head));
      insertDept.finalize();
      const chains = [
        { role: "employee",         chain: ["department_head", "hr", "manager", "ceo"] },
        { role: "department_head",  chain: ["manager", "ceo"] },
        { role: "hr",               chain: ["manager", "ceo"] },
        { role: "manager",          chain: ["ceo"] },
        { role: "ceo",              chain: [] }
      ];
      const insertChain = db.prepare(`INSERT INTO approval_chains (initiator_role, chain) VALUES (?, ?)`);
      chains.forEach(c => insertChain.run(c.role, JSON.stringify(c.chain)));
      insertChain.finalize();
    }
  });

});
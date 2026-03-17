const db = require("../config/db");

exports.onlyAdmin = (req,res,next)=>{
  const role = req.headers["x-user-role"]

  if(role !== "admin"){
    return res.status(403).json({error:"Only admin can perform this action"})
  }

  next()
}

exports.getUsers = (req, res) => {
  db.all("SELECT * FROM users", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.getUsersByRole = (req, res) => {
  const { role } = req.params;
  db.all("SELECT * FROM users WHERE role=?", [role], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.login = (req, res) => {
  const { id } = req.body;
  db.get("SELECT * FROM users WHERE id=?", [id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: "Invalid user ID" });
    res.json(user);
  });
};

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath =
  process.env.DB_PATH || path.join(__dirname, "../workflow.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Connected to SQLite database:", dbPath);
  }
});

module.exports = db;

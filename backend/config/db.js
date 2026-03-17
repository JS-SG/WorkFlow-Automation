const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./workflow.db", (err) => {
 if (err) console.error(err.message);
 console.log("Connected to SQLite database.");
});

module.exports = db;
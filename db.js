const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');

// Create a simple table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    )
  `);
});

module.exports = db;

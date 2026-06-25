// server/db.js — initializes SQLite DB and exposes helper functions
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, 'data');
if(!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, {recursive:true});
const dbPath = path.join(dataDir, 'database.sqlite');
const db = new Database(dbPath);

// create orders table
db.prepare(`CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  style TEXT,
  quantity INTEGER,
  total INTEGER,
  status TEXT,
  created_at TEXT
)`).run();

module.exports = db;

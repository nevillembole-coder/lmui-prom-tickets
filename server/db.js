// server/db.js — Postgres connection with auto-table creation
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Auto-create orders table on startup
pool.query(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    style TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    total INTEGER,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).then(() => {
  console.log('✓ orders table ready');
}).catch(err => {
  console.error('Table creation error:', err);
});

module.exports = pool;

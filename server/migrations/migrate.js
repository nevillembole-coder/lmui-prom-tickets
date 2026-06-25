// server/migrations/migrate.js — auto-create orders table on startup
const pool = require('../db');

async function migrate() {
  try {
    await pool.query(`
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
    `);
    console.log('✓ orders table ready');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  migrate().then(() => process.exit(0));
}

module.exports = migrate;

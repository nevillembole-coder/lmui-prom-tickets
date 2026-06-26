// server/server.js — Express with Postgres (simplified)
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const FLW_SECRET = process.env.FLW_SECRET_KEY;
if (!FLW_SECRET) console.warn('⚠ FLW_SECRET_KEY not set in environment');

// POST /create-order
app.post('/create-order', async (req, res) => {
  const { name, email, style, quantity, total } = req.body;
  if (!name || !email || !style || !quantity) {
    return res.status(400).json({ error: 'invalid order' });
  }
  const id = uuidv4();
  try {
    const result = await pool.query(
      'INSERT INTO orders (id, name, email, style, quantity, total, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [id, name, email, style, quantity, total || 0, 'pending']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('create-order error:', err);
    res.status(500).json({ error: 'order creation failed' });
  }
});

// POST /verify-payment
app.post('/verify-payment', async (req, res) => {
  const { transaction_id, tx_ref, order_id } = req.body;
  if (!transaction_id) {
    return res.status(400).json({ error: 'transaction_id required' });
  }
  if (!FLW_SECRET) {
    return res.status(500).json({ error: 'server not configured with FLW secret key' });
  }

  try {
    const url = `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${FLW_SECRET}` }
    });
    const j = await response.json();

    if (j && j.status === 'success' && j.data && j.data.status === 'successful') {
      if (order_id) {
        await pool.query('UPDATE orders SET status = $1 WHERE id = $2', ['paid', order_id]);
      }
    }
    res.json(j);
  } catch (err) {
    console.error('verify-payment error:', err);
    res.status(500).json({ error: 'verification failed', detail: err.message });
  }
});

// POST /webhook
app.post('/webhook', (req, res) => {
  console.log('Webhook received:', req.body);
  res.json({ received: true });
});

// GET /orders
app.get('/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('orders error:', err);
    res.status(500).json({ error: 'failed to fetch orders' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server listening on port ${port}`));

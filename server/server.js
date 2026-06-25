// server/server.js — small Express server to store orders and verify Flutterwave payments
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const FLW_SECRET = process.env.FLW_SECRET_KEY;
if(!FLW_SECRET) console.warn('Warning: FLW_SECRET_KEY not set in environment');

// create-order: client calls this to register an order before payment (optional)
app.post('/create-order', (req, res) => {
  const { name, email, style, quantity, total } = req.body;
  if(!name || !email || !style || !quantity) return res.status(400).json({error:'invalid order'});
  const id = uuidv4();
  const created_at = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO orders (id,name,email,style,quantity,total,status,created_at) VALUES (?,?,?,?,?,?,?,?)');
  stmt.run(id, name, email, style, quantity, total||0, 'pending', created_at);
  res.json({ id, name, email, style, quantity, total, status: 'pending', created_at });
});

// verify-payment: after checkout, client sends transaction_id and tx_ref (and optionally order_id)
app.post('/verify-payment', async (req, res) => {
  const { transaction_id, tx_ref, order_id } = req.body;
  if(!transaction_id) return res.status(400).json({error:'transaction_id required'});
  if(!FLW_SECRET) return res.status(500).json({error:'server not configured with FLW secret key'});

  try{
    const url = `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`;
    const response = await fetch(url, { method:'GET', headers: { 'Authorization': `Bearer ${FLW_SECRET}` } });
    const j = await response.json();
    if(j && j.status === 'success' && j.data && j.data.status === 'successful'){
      // mark order paid if order_id provided
      if(order_id){
        const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
        stmt.run('paid', order_id);
      }
    }
    res.json(j);
  }catch(err){
    console.error('verify-payment error', err);
    res.status(500).json({error:'verification failed', detail: err.message});
  }
});

// optional: webhook endpoint to receive Flutterwave webhooks
app.post('/webhook', (req, res) => {
  console.log('webhook', req.body);
  // TODO: verify signature and update DB accordingly
  res.json({received:true});
});

// admin: list orders
app.get('/orders', (req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json(rows);
});

const port = process.env.PORT || 4000;
app.listen(port, ()=>console.log(`Server listening on ${port}`));

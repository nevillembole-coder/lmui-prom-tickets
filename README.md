# LMUI Prom Tickets — Static + Server demo with DB

This repository now contains a static front-end and a small Node/Express server that stores orders in a SQLite database and verifies payments via Flutterwave.

Important: You must add your own Flutterwave keys and deploy the server. Do NOT put secret keys in the client-side files.

Required assets (add to repository root `assets/`):
- assets/hero.jpg
- assets/ticket_regular.jpg
- assets/ticket_classic.jpg

Quick file list added:
- index.html, styles.css, app.js (frontend)
- server/package.json, server/server.js, server/db.js
- README.md (this file)

Server
- Uses SQLite (better-sqlite3) to store orders in `server/data/database.sqlite`.
- Endpoints:
  - POST /create-order  — create an order record (name,email,style,quantity,total)
  - POST /verify-payment — verify Flutterwave transaction and update order status
  - GET /orders — list orders (for admin/debug)
- Configure environment in server/.env (FLW_SECRET_KEY)

Deploy server
- Deploy the `server/` directory to a Node-compatible host (Render, Heroku, Fly, Vercel Serverless functions, etc.).
- Set FLW_SECRET_KEY in environment variables on the host.
- Set CORS origin to allow your frontend domain.

Front-end
- Update `app.js` constants:
  - FLW_PUBLIC_KEY (public key, test or live)
  - SERVER_BASE (URL where the server is deployed)

How it works
1. User fills the form and clicks Pay.
2. Front-end optionally creates an order record on the server (/create-order).
3. Front-end opens Flutterwave Checkout widget for mobile money.
4. After payment, Flutterwave returns a transaction_id. The front-end sends transaction_id and order_id to /verify-payment.
5. Server calls Flutterwave's verify endpoint, confirms the payment and updates the order status to `paid`.
6. If verified, the front-end generates a PDF ticket and user downloads it.

Security
- Keep FLW_SECRET_KEY on the server only.
- Verify transactions server-side before fulfilling tickets.

If you want, I can now push these files into your repository (I already prepared them). I will push and then you can review and deploy the server. Replace placeholders in app.js and set FLW_SECRET_KEY in server environment after deployment.

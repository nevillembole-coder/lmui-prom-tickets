// app.js — front-end that creates server-side order, opens Flutterwave checkout, then verifies payment and generates ticket PDF
(function(){
  // Prices (XAF)
  const PRICES = {regular:2500, classic:20000};

  // Replace with your Flutterwave public key (test or live)
  const FLW_PUBLIC_KEY = 'FLWPUBK_TEST-REPLACE_ME';

  // Replace with your deployed server URL (e.g., https://payments.example.com)
  const SERVER_BASE = 'REPLACE_WITH_SERVER_URL';

  const form = document.getElementById('purchaseForm');
  const quantityEl = document.getElementById('quantity');
  const nameEl = document.getElementById('name');
  const emailEl = document.getElementById('email');
  const messageEl = document.getElementById('message');
  const previewImage = document.getElementById('previewImage');
  const previewDetails = document.getElementById('previewDetails');
  const ordersList = document.getElementById('ordersList');

  function getSelectedStyle(){
    const s = document.querySelector('input[name="style"]:checked');
    return s ? s.value : 'regular';
  }

  function formatCurrency(n){return new Intl.NumberFormat().format(n) + ' FCFA'}

  function updatePreview(){
    const style = getSelectedStyle();
    const qty = Number(quantityEl.value||1);
    previewImage.style.backgroundImage = style === 'classic' ? "url('assets/ticket_classic.jpg')" : "url('assets/ticket_regular.jpg')";
    const price = PRICES[style];
    previewDetails.innerHTML = `<p><strong>Style:</strong> ${style}</p><p><strong>Quantity:</strong> ${qty}</p><p><strong>Total:</strong> ${formatCurrency(price*qty)}</p>`;
  }

  document.querySelectorAll('input[name="style"]').forEach(r=>r.addEventListener('change', updatePreview));
  quantityEl.addEventListener('input', updatePreview);
  updatePreview();

  // local storage functions
  function saveOrder(order){
    const key = 'lmui_prom_orders_v1';
    const arr = JSON.parse(localStorage.getItem(key)||'[]');
    arr.push(order);
    localStorage.setItem(key, JSON.stringify(arr));
  }
  function getOrders(){ return JSON.parse(localStorage.getItem('lmui_prom_orders_v1')||'[]'); }

  function renderOrders(){
    const arr = getOrders();
    if(!arr.length){ ordersList.innerHTML = '<em>No orders yet in this browser.</em>'; return; }
    ordersList.innerHTML = arr.map(o=>`<div style="border-bottom:1px dashed rgba(255,255,255,0.06);padding:6px 0"><strong>${o.name}</strong> — ${o.style} x${o.quantity} — ${o.total} — <span class="small">${o.id}</span></div>`).join('');
  }
  document.getElementById('showOrders').addEventListener('click', renderOrders);
  document.getElementById('exportCsv').addEventListener('click', ()=>{
    const arr = getOrders();
    if(!arr.length){ alert('No orders to export'); return; }
    const headers = ['id','name','email','style','quantity','total','timestamp'];
    const rows = arr.map(r=>headers.map(h=>`"${(r[h]||'').toString().replace(/"/g,'""')}"`).join(','));
    const csv = [headers.join(','),...rows].join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'lmui_prom_orders.csv'; a.click(); URL.revokeObjectURL(url);
  });

  // generate ticket PDF after payment verified
  function generateTicketPdf(order){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:'pt',format:[450,250]});
    const padding = 18;
    doc.setFillColor(7,4,10);
    doc.rect(0,0,450,250,'F');
    doc.setFontSize(20); doc.setTextColor(201,161,42); doc.text('LMUI PROM', padding, 40);
    doc.setFontSize(12); doc.setTextColor(220,220,220); doc.text('King & Queen Gala Night 2026', padding, 60);
    doc.setFontSize(11); doc.text(`Name: ${order.name}`, padding, 90);
    doc.text(`Email: ${order.email}`, padding, 110);
    doc.text(`Ticket: ${order.style}`, padding, 130);
    doc.text(`Qty: ${order.quantity}  Total: ${order.total}`, padding, 150);
    doc.text(`Date: 4th July 2026`, padding, 170);
    doc.setFontSize(9); doc.text(`Ticket ID: ${order.id}`, padding, 190);

    return new Promise(resolve=>{
      const container = document.createElement('div');
      const qr = new QRCode(container, {text:order.id,width:100,height:100,correctLevel:0});
      setTimeout(()=>{
        const img = container.querySelector('img') || container.querySelector('canvas');
        if(img){
          const dataUrl = img.src;
          doc.addImage(dataUrl,'PNG',330,60,90,90);
        }
        const out = doc.output('blob');
        resolve(out);
      },250);
    });
  }

  // Create order on server then start payment
  async function createOrderOnServer(order){
    if(!SERVER_BASE || SERVER_BASE === 'REPLACE_WITH_SERVER_URL'){
      // No server configured — create local-only order id
      return {...order};
    }
    const resp = await fetch(SERVER_BASE + '/create-order', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(order)
    });
    if(!resp.ok) throw new Error('Failed creating order on server');
    return resp.json();
  }

  // Payment & verification flow (Flutterwave)
  async function startPayment(order){
    const tx_ref = `lmui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
    const amountNumeric = Number(order.quantity) * (PRICES[order.style] || 0);

    // call server to create order record (if server configured)
    let serverOrder = order;
    try{
      serverOrder = await createOrderOnServer(order);
    }catch(err){ console.warn('server order create failed',err); }

    window.FlutterwaveCheckout({
      public_key: FLW_PUBLIC_KEY,
      tx_ref: tx_ref,
      amount: amountNumeric,
      currency: "XAF",
      payment_options: "mobilemoney",
      customer: { email: serverOrder.email, phonenumber: serverOrder.phone || '', name: serverOrder.name },
      meta: { order_id: serverOrder.id },
      customizations: { title: "LMUI Prom Tickets", description: `${serverOrder.style} ticket` },
      callback: async function (data) {
        messageEl.textContent = 'Payment completed — verifying...';
        try {
          if(!SERVER_BASE || SERVER_BASE === 'REPLACE_WITH_SERVER_URL'){
            messageEl.textContent = 'No server verification configured. In production, verify server-side.';
            const blob = await generateTicketPdf(order);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `LMUI_ticket_${order.id}.pdf`; a.click(); URL.revokeObjectURL(url);
            messageEl.textContent = 'Ticket downloaded (demo).';
            return;
          }

          const resp = await fetch(SERVER_BASE + '/verify-payment', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ transaction_id: data.transaction_id, tx_ref: data.tx_ref, order_id: serverOrder.id })
          });
          const j = await resp.json();
          if(j && j.status === 'success' && j.data && j.data.status === 'successful'){
            messageEl.textContent = 'Payment verified. Generating ticket PDF...';
            const blob = await generateTicketPdf(order);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `LMUI_ticket_${order.id}.pdf`; a.click(); URL.revokeObjectURL(url);
            messageEl.textContent = 'Ticket downloaded. Thank you!';
          } else {
            messageEl.textContent = 'Payment verification failed. Contact support.';
          }
        } catch(err){ console.error(err); messageEl.textContent = 'Error verifying payment'; }
      },
      onclose: function() {}
    });
  }

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const style = getSelectedStyle();
    const quantity = Number(quantityEl.value || 1);
    if(!name || !email || quantity < 1){ messageEl.textContent = 'Please fill required details'; return; }
    const totalNumeric = PRICES[style] * quantity;
    const total = formatCurrency(totalNumeric);
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    const order = {id,name,email,style,quantity,total,timestamp:new Date().toISOString()};

    // Save locally as a record
    saveOrder(order);

    messageEl.textContent = 'Opening payment widget...';
    startPayment(order);
  });

  // initial
  renderOrders();
})();

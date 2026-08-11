const STORAGE_KEY = 'letsinvoice_draft_v1';
let zoom = 1;
let state = {
  template: 't1',
  business: { name: '', email: '', phone: '', gst: '', address: '', logo: '' },
  client: { name: '', gst: '', address: '' },
  invoice: { number: 'INV-001', date: '', due: '' },
  labels: { invoice: '', from: '', to: '' },
  currency: '₹',
  taxRate: '18',
  discount: '0',
  notes: 'Thank you for your business.',
  paymentDetails: 'UPI: yourupi@bank\nBank: XXXXXXXX\nIFSC: XXXXXXXX',
  items: [
    { desc: 'Sample Service', qty: 1, rate: 1000 }
  ]
};

function money(n) {
  const v = Number(n || 0);
  if (state.currency === '₹') {
    // Indian numbering: lakhs, crores
    return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return state.currency + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function itemAmount(item) {
  return (Number(item.qty) || 0) * (Number(item.rate) || 0);
}

function calculateTotals() {
  const subtotal = state.items.reduce((s, i) => s + itemAmount(i), 0);
  const discountRaw = state.discount === '' ? 0 : Math.max(0, Number(state.discount) || 0);
  const discount = Math.min(discountRaw, subtotal); // cap discount at subtotal
  const taxable = Math.max(0, subtotal - discount);
  const tax = state.taxRate === '' ? 0 : taxable * (Number(state.taxRate) || 0) / 100;
  const total = taxable + tax;
  return { subtotal, discount, tax, total };
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00'); // force local parse
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getInvoiceHTML() {
  const t = state.template;
  const totals = calculateTotals();
  const bizInitials = (state.business.name || 'PM').split(/\s+/).map(x => x[0]).slice(0,2).join('').toUpperCase();
  const invoiceDate = formatDate(state.invoice.date);
  const dueDate = formatDate(state.invoice.due);
  
  const lblInv = state.labels?.invoice || 'Tax Invoice';
  const lblFrom = state.labels?.from || 'From';
  const lblTo = state.labels?.to || 'Bill to';

  const lines = state.items.map((item, idx) => `
    <tr>
      <td>${escapeHTML(item.desc || `Item ${idx + 1}`)}</td>
      <td class="m">${Number(item.qty) || 0}</td>
      <td class="m">${money(item.rate)}</td>
      <td class="m">${money(itemAmount(item))}</td>
    </tr>
  `).join('');

  const logoHTML = state.business.logo
    ? `<img src="${state.business.logo}" style="max-height:40px;max-width:130px;object-fit:contain;display:block;margin-bottom:4px;" alt="logo">`
    : '';

  const dateChip = invoiceDate ? `<div class="chip"><div class="cl">Date</div><div class="cv g">${escapeHTML(invoiceDate)}</div></div>` : '';
  const dueChip = dueDate ? `<div class="chip"><div class="cl">Due</div><div class="cv g">${escapeHTML(dueDate)}</div></div>` : '';

  const genericHeaderInfo = `
    <div class="chips">
      <div class="chip"><div class="cl">Invoice #</div><div class="cv">${escapeHTML(state.invoice.number || 'INV-001')}</div></div>
      ${dateChip}
      ${dueChip}
    </div>`;

  const commonParties = `
    <div class="parties">
      <div>
        <div class="pl">${escapeHTML(lblFrom)}</div>
        <div class="pn">${escapeHTML(state.business.name || 'Your Business')}</div>
        <div class="pd">${escapeHTML(state.business.address || '')}${state.business.gst ? `\nGSTIN: ${escapeHTML(state.business.gst)}` : ''}${state.business.email ? `\n${escapeHTML(state.business.email)}` : ''}${state.business.phone ? `\n${escapeHTML(state.business.phone)}` : ''}</div>
      </div>
      <div>
        <div class="pl">${escapeHTML(lblTo)}</div>
        <div class="pn">${escapeHTML(state.client.name || 'Client')}</div>
        <div class="pd">${escapeHTML(state.client.address || '')}${state.client.gst ? `\nGSTIN: ${escapeHTML(state.client.gst)}` : ''}</div>
      </div>
    </div>`;

  const discountRow = (state.discount !== '' && state.discount !== null) ? `<div class="tr-r"><span>Discount</span><span>${money(totals.discount)}</span></div>` : '';
  const taxRow = (state.taxRate !== '' && state.taxRate !== null) ? `<div class="tr-r"><span>Tax (${Number(state.taxRate)||0}%)</span><span>${money(totals.tax)}</span></div>` : '';

  const totalsBox = `
    <div class="tw-w"><div class="tw">
      <div class="tr-r"><span>Subtotal</span><span>${money(totals.subtotal)}</span></div>
      ${discountRow}
      ${taxRow}
      <div class="tr-r big"><span>Total</span><span>${money(totals.total)}</span></div>
    </div></div>`;

  const notesHtml = state.notes ? `<div class="inv-foot-n"><strong>Notes</strong>${escapeHTML(state.notes)}</div>` : '';
  const payHtml = state.paymentDetails ? `<div class="inv-foot-b">${escapeHTML(state.paymentDetails)}</div>` : '';
  
  const footerBox = (notesHtml || payHtml) ? `<div class="ft"><div class="inv-foot">${notesHtml}${payHtml}</div></div>` : '';
  const mfootBox = (notesHtml || payHtml) ? `<div class="mfoot"><div class="inv-foot">${notesHtml}${payHtml}</div></div>` : '';

  if (t === 't2') {
    return `<div class="invoice-shell t2">
      <div class="h"><div class="h-top"><div>${logoHTML}<div class="biz-name">${escapeHTML(state.business.name || 'Your Business')}</div><div class="biz-sub">${escapeHTML(state.business.email || '')}${state.business.gst ? ` · GSTIN ${escapeHTML(state.business.gst)}` : ''}</div></div><div><div class="inv-word">${escapeHTML(lblInv.toUpperCase())}</div><div class="inv-num">${escapeHTML(state.invoice.number || 'INV-001')}</div></div></div>${genericHeaderInfo}</div>
      ${commonParties}
      <div class="iw"><table class="inv-t"><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${lines}</tbody></table></div>
      ${totalsBox}
      ${footerBox}
    </div>`;
  }

  if (t === 't3') {
    const t3date = invoiceDate ? `<span>Date: <strong>${escapeHTML(invoiceDate)}</strong></span>` : '';
    const t3due = dueDate ? `<span class="due">Due: <strong>${escapeHTML(dueDate)}</strong></span>` : '';
    const t3datebar = `<div class="datebar">
      <span>Invoice: <strong>${escapeHTML(state.invoice.number || 'INV-001')}</strong></span>
      ${t3date}
      ${t3due}
    </div>`;
    const t3avatar = state.business.logo
      ? `<img src="${state.business.logo}" style="width:34px;height:34px;border-radius:6px;object-fit:contain;flex-shrink:0;" alt="logo">`
      : `<div class="av">${escapeHTML(bizInitials)}</div>`;
    return `<div class="invoice-shell t3">
      <div class="h"><div class="biz-r">${t3avatar}<div><div class="biz-name">${escapeHTML(state.business.name || 'Your Business')}</div><div class="biz-sub">${escapeHTML(state.business.email || '')}</div></div></div><div><div class="inv-word">${escapeHTML(lblInv)}</div><div class="inv-num">${escapeHTML(state.invoice.number || 'INV-001')}</div></div></div>
      ${t3datebar}
      ${commonParties}
      <div class="iw"><table class="inv-t"><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${lines}</tbody></table></div>
      ${totalsBox}
      ${footerBox}
    </div>`;
  }

  if (t === 't4') {
    return `<div class="invoice-shell t4">
      <div class="h"><div class="h-top"><div>${logoHTML}<div class="biz-name">${escapeHTML(state.business.name || 'Your Business')}</div><div class="biz-sub">${escapeHTML(state.business.email || '')}${state.business.gst ? ` · GSTIN ${escapeHTML(state.business.gst)}` : ''}</div></div><div><div class="inv-lbl">${escapeHTML(lblInv)}</div><div class="inv-num">${escapeHTML(state.invoice.number || 'INV-001')}</div></div></div>${genericHeaderInfo}</div>
      ${commonParties}
      <div class="iw"><table class="inv-t"><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${lines}</tbody></table></div>
      ${totalsBox}
      ${footerBox}
    </div>`;
  }

  if (t === 't5') {
    const t5ring = state.business.logo
      ? `<img src="${state.business.logo}" style="width:36px;height:36px;object-fit:contain;border-radius:6px;display:block;margin-bottom:3px;" alt="logo">`
      : `<div class="ring"><div class="rinit">${escapeHTML(bizInitials)}</div></div>`;
    const p1 = invoiceDate ? `<div class="pline">${escapeHTML(invoiceDate)}</div>` : '';
    const p2 = dueDate ? `<div class="pline">Due ${escapeHTML(dueDate)}</div>` : '';
    return `<div class="invoice-shell t5">
      <div class="side">
        <div>${t5ring}<div class="sbiz">${escapeHTML(state.business.name || 'Your Business')}</div><div class="sdet">${escapeHTML(state.business.email || '')}</div></div>
        <div><div class="slbl">${escapeHTML(lblTo)}</div><div class="sname">${escapeHTML(state.client.name || 'Client')}</div><div class="ssdet">${escapeHTML(state.client.address || '')}</div></div>
        <div><div class="slbl">Invoice</div><div class="ppill"><div class="pline">${escapeHTML(state.invoice.number || 'INV-001')}</div>${p1}${p2}</div></div>
      </div>
      <div class="main"><div class="inv-word">${escapeHTML(lblInv)}</div><div class="inv-num">${escapeHTML(state.invoice.number || 'INV-001')}</div><div style="margin-top:16px"><table class="inv-t"><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${lines}</tbody></table></div>${totalsBox}${mfootBox}</div>
    </div>`;
  }

  if (t === 't6') {
    const t6d1 = invoiceDate ? `<span>Issued:</span><span>${escapeHTML(invoiceDate)}</span>` : '';
    const t6d2 = dueDate ? `<span>Due:</span><span>${escapeHTML(dueDate)}</span>` : '';
    return `<div class="invoice-shell t6">
      <div class="h"><div class="biz-l"><div class="bar4" style="background:var(--ink)"></div>${logoHTML}<div><div class="biz-name">${escapeHTML(state.business.name || 'Your Business')}</div><div class="biz-sub">${escapeHTML(state.business.email || '')}${state.business.gst ? ` · GSTIN ${escapeHTML(state.business.gst)}` : ''}</div></div></div><div><div class="inv-word">INV</div><div class="inv-num">${escapeHTML(state.invoice.number || 'INV-001')}</div></div></div>
      <div class="datebar">${t6d1}${t6d2}<span>Currency:</span><span>${escapeHTML(state.currency)}</span></div>
      ${commonParties}
      <div class="iw"><table class="inv-t"><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${lines}</tbody></table></div>
      ${totalsBox}
      ${footerBox}
    </div>`;
  }

  if (t === 't7') {
    return `<div class="invoice-shell t7">
      <div class="h"><div>${logoHTML}<div class="biz-name">${escapeHTML(state.business.name || 'Your Business')}</div><div class="biz-sub">${escapeHTML(state.business.email || '')}</div></div><div><div class="inv-lbl">${escapeHTML(lblInv)}</div><div class="inv-num">${escapeHTML(state.invoice.number || 'INV-001')}</div></div></div>
      ${commonParties}
      <div class="iw"><table class="inv-t"><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${lines}</tbody></table></div>
      ${totalsBox}
      ${footerBox}
    </div>`;
  }

  // t1 — Classic (default)
  return `<div class="invoice-shell t1">
    <div class="h"><div>${logoHTML}<div class="biz-name">${escapeHTML(state.business.name || 'Your Business')}</div><div class="biz-sub">${escapeHTML(state.business.email || '')}${state.business.gst ? ` · GSTIN ${escapeHTML(state.business.gst)}` : ''}</div></div><div><div class="inv-word">${escapeHTML(lblInv.toUpperCase())}</div><div class="inv-num">${escapeHTML(state.invoice.number || 'INV-001')}</div></div></div>
    ${commonParties}
    <div class="iw"><table class="inv-t"><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${lines}</tbody></table></div>
    ${totalsBox}
    ${footerBox}
  </div>`;
}

function renderItems() {
  const wrap = document.getElementById('itemsWrap');
  // Remember which input had focus and its cursor position
  const focused = document.activeElement;
  const focusedIdx = focused ? focused.dataset.idx : null;
  const focusedField = focused ? focused.dataset.field : null;

  wrap.innerHTML = state.items.map((item, idx) => `
    <div class="ir" data-index="${idx}">
      <input data-field="desc" data-idx="${idx}" placeholder="Service / product" value="${escapeAttr(item.desc)}" />
      <input data-field="qty" data-idx="${idx}" inputmode="numeric" value="${Number(item.qty) || 0}" />
      <input data-field="rate" data-idx="${idx}" inputmode="decimal" value="${Number(item.rate) || 0}" />
      <div class="iamt">${money(itemAmount(item))}</div>
      <button class="del" title="Remove item" onclick="removeItem(${idx})">×</button>
    </div>
  `).join('');

  // Restore focus
  if (focusedIdx !== null && focusedField !== null) {
    const el = wrap.querySelector(`[data-idx="${focusedIdx}"][data-field="${focusedField}"]`);
    if (el) { el.focus(); el.select(); }
  }
}

function renderTotals() {
  const t = calculateTotals();
  document.getElementById('sumSubtotal').textContent = money(t.subtotal);
  document.getElementById('sumDiscount').textContent = money(t.discount);
  document.getElementById('sumTax').textContent = money(t.tax);
  document.getElementById('sumTotal').textContent = money(t.total);
}

function renderPreview() {
  const doc = document.getElementById('invoiceDoc');
  doc.innerHTML = getInvoiceHTML();
  doc.style.transform = `scale(${zoom})`;
  // Adjust wrapper height so panel scrolls correctly at any zoom level
  const scaled = doc.offsetHeight * zoom;
  doc.style.marginBottom = zoom < 1 ? `${scaled - doc.offsetHeight}px` : `${(zoom - 1) * doc.offsetHeight}px`;
}

function syncInputsToState() {
  state.business.name = val('fromName');
  state.business.email = val('fromEmail');
  state.business.phone = val('fromPhone');
  state.business.gst = val('fromGST');
  state.business.address = val('fromAddress');
  state.client.name = val('toName');
  state.client.gst = val('toGST');
  state.client.address = val('toAddress');
  state.invoice.number = val('invNo') || 'INV-001';
  state.invoice.date = val('invDate');
  state.invoice.due = val('dueDate');
  state.labels = state.labels || {};
  state.labels.invoice = val('labelInvoice');
  state.labels.from = val('labelFrom');
  state.labels.to = val('labelTo');
  state.currency = val('currency') || '₹';
  state.taxRate = val('taxRate');
  state.discount = val('discount');
  state.notes = val('notes');
  state.paymentDetails = val('paymentDetails');
}

function fillInputsFromState() {
  setVal('fromName', state.business.name);
  setVal('fromEmail', state.business.email);
  setVal('fromPhone', state.business.phone);
  setVal('fromGST', state.business.gst);
  setVal('fromAddress', state.business.address);
  setVal('toName', state.client.name);
  setVal('toGST', state.client.gst);
  setVal('toAddress', state.client.address);
  setVal('invNo', state.invoice.number);
  setVal('invDate', state.invoice.date);
  setVal('dueDate', state.invoice.due);
  if (state.labels) {
    setVal('labelInvoice', state.labels.invoice);
    setVal('labelFrom', state.labels.from);
    setVal('labelTo', state.labels.to);
  }
  setVal('currency', state.currency);
  setVal('taxRate', state.taxRate);
  setVal('discount', state.discount);
  setVal('notes', state.notes);
  setVal('paymentDetails', state.paymentDetails);
}

function updateEverything() {
  syncInputsToState();
  renderItems();
  renderTotals();
  renderPreview();
  saveDraftSilent();
}

function setTemplate(tpl) {
  state.template = tpl;
  document.querySelectorAll('.tpill').forEach(btn => btn.classList.toggle('on', btn.dataset.tpl === tpl));
  document.querySelectorAll('.tpl-card').forEach(card => card.classList.toggle('active', card.dataset.tpl === tpl));
  renderPreview();
  saveDraftSilent();
}

function addItem() {
  state.items.push({ desc: '', qty: 1, rate: 0 });
  updateEverything();
}

function removeItem(index) {
  if (state.items.length === 1) {
    state.items[0] = { desc: '', qty: 1, rate: 0 };
  } else {
    state.items.splice(index, 1);
  }
  updateEverything();
}

// Only update the amount cell, not the whole items list — preserves focus & cursor position
function updateItem(index, field, value) {
  if (!state.items[index]) return;
  state.items[index][field] = field === 'desc' ? value : Number(value || 0);
  // Just update the amount display for this row, leave inputs untouched
  const amtCell = document.querySelector(`.ir[data-index="${index}"] .iamt`);
  if (amtCell) amtCell.textContent = money(itemAmount(state.items[index]));
  renderTotals();
  renderPreview();
  saveDraftSilent();
}

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}
function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}
function escapeHTML(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function escapeAttr(str) { return escapeHTML(str).replaceAll('\n', ' '); }

function toggleFaq(el) {
  el.parentElement.classList.toggle('open');
}

function toggleSection(hd) {
  hd.closest('.fsec').classList.toggle('col');
}

function zoomIn() { zoom = Math.min(1.4, zoom + 0.05); renderPreview(); }
function zoomOut() { zoom = Math.max(0.7, zoom - 0.05); renderPreview(); }
function zoomReset() { zoom = 1; renderPreview(); }

function saveDraftSilent() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}
function saveDraft() {
  saveDraftSilent();
  alert('Draft saved in this browser.');
}
function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data) return false;
    state = { ...state, ...data, business: { ...state.business, ...(data.business || {}) }, client: { ...state.client, ...(data.client || {}) }, invoice: { ...state.invoice, ...(data.invoice || {}) }, items: Array.isArray(data.items) && data.items.length ? data.items : state.items };
    if (!state.items.length) state.items = [{ desc: '', qty: 1, rate: 0 }];
    return true;
  } catch (e) { return false; }
}

function clearAll() {
  if (!confirm('Clear all fields?')) return;
  state = {
    template: 't1',
    business: { name: '', email: '', phone: '', gst: '', address: '', logo: '' },
    client: { name: '', gst: '', address: '' },
    invoice: { number: 'INV-001', date: '', due: '' },
    currency: '₹',
    taxRate: 18,
    discount: 0,
    notes: '',
    paymentDetails: '',
    items: [{ desc: '', qty: 1, rate: 0 }]
  };
  fillInputsFromState();
  // Reset logo UI
  document.getElementById('logoPreview').style.display = 'none';
  document.getElementById('logoPreview').src = '';
  document.getElementById('logoUploadText').textContent = 'Drop or choose logo (PNG recommended)';
  document.getElementById('logoRemoveBtn').style.display = 'none';
  document.getElementById('logoInput').value = '';
  setTemplate('t1');
  updateEverything();
}

function loadSample() {
  const currentTemplate = state.template;
  state = {
    template: 't4',
    business: { name: 'Priya Mehta Studio', email: 'priya@mehtastudio.in', phone: '+91 98765 43210', gst: '27AABCX1234Z1Z5', address: '123 Koregaon Park\nPune, MH 411001', logo: state.business.logo || '' },
    client: { name: 'Nexus Tech Pvt. Ltd.', gst: '27AAACN1234Q1Z9', address: 'Tower 3, Cybercity\nMumbai 400076' },
    invoice: { number: 'INV-2025-042', date: '2025-03-27', due: '2025-04-11' },
    currency: '₹',
    taxRate: 18,
    discount: 0,
    notes: 'Payment due within 15 days. Thank you for working with us.',
    paymentDetails: 'UPI: priya@hdfcbank\nBank: HDFC Bank\nA/C: 1234567890\nIFSC: HDFC0001234',
    items: [
      { desc: 'Brand Identity Design', qty: 1, rate: 45000 },
      { desc: 'Website UI/UX Design', qty: 1, rate: 35000 },
      { desc: 'Social Media Pack', qty: 2, rate: 8000 }
    ]
  };
  state.template = currentTemplate || 't1';
  fillInputsFromState();
  setTemplate(state.template);
  updateEverything();
}

function downloadPDF() {
  // TODO: replace this check with real payment verification (Razorpay/Stripe/Gumroad)
  // showPaywall(); return; // ← uncomment this line to re-enable the paywall gate
  
  // Temporarily reset zoom to ensure correct print scaling
  const oldZoom = zoom;
  if (zoom !== 1) {
    zoomReset();
  }
  
  // The @media print CSS will hide the UI and format #invoiceDoc for A4.
  window.print();
  
  // Restore zoom after print dialog
  if (oldZoom !== 1) {
    zoom = oldZoom;
    renderPreview();
  }
}

function removeLogo() {
  state.business.logo = '';
  const img = document.getElementById('logoPreview');
  const txt = document.getElementById('logoUploadText');
  const btn = document.getElementById('logoRemoveBtn');
  const input = document.getElementById('logoInput');
  img.src = '';
  img.style.display = 'none';
  txt.textContent = 'Drop or choose logo (PNG recommended)';
  btn.style.display = 'none';
  input.value = '';
  renderPreview();
  saveDraftSilent();
}

function hidePaywall() { document.getElementById('paywallModal').classList.remove('show'); }
function showPaywall() { document.getElementById('paywallModal').classList.add('show'); }

function bindEvents() {
  document.querySelectorAll('#formPanel input:not([data-field]), #formPanel textarea, #formPanel select').forEach(el => {
    el.addEventListener('input', () => {
      syncInputsToState();
      renderItems();
      renderTotals();
      renderPreview();
      saveDraftSilent();
    });
  });

  // Item row input — update without re-rendering the whole list (preserves focus)
  document.getElementById('itemsWrap').addEventListener('input', (e) => {
    const input = e.target;
    if (!input.matches('input')) return;
    const idx = Number(input.dataset.idx);
    const field = input.dataset.field;
    if (field) updateItem(idx, field, input.value);
  });

  // Select-all on focus for qty/rate inputs so typing immediately replaces the value
  document.getElementById('itemsWrap').addEventListener('focus', (e) => {
    const input = e.target;
    if (!input.matches('input[inputmode]')) return;
    setTimeout(() => input.select(), 0);
  }, true);

  document.querySelectorAll('.tpill').forEach(btn => {
    btn.addEventListener('click', () => setTemplate(btn.dataset.tpl));
  });

  document.querySelectorAll('.tpl-card').forEach(card => {
    card.addEventListener('click', () => setTemplate(card.dataset.tpl));
  });

  const logoInput = document.getElementById('logoInput');
  logoInput.addEventListener('change', () => {
    const file = logoInput.files && logoInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.business.logo = reader.result;
      const img = document.getElementById('logoPreview');
      const txt = document.getElementById('logoUploadText');
      const btn = document.getElementById('logoRemoveBtn');
      img.src = reader.result;
      img.style.display = 'block';
      txt.textContent = 'Logo loaded';
      btn.style.display = 'block';
      renderPreview();
      saveDraftSilent();
    };
    reader.readAsDataURL(file);
  });

  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
    document.getElementById('stickyCta').classList.toggle('show', window.scrollY > 500);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); observer.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.rv').forEach(el => observer.observe(el));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hidePaywall();
  });
}

function init() {
  const loaded = loadDraft();
  fillInputsFromState();
  // Restore logo preview if draft had a logo
  if (state.business.logo) {
    const img = document.getElementById('logoPreview');
    const txt = document.getElementById('logoUploadText');
    const btn = document.getElementById('logoRemoveBtn');
    img.src = state.business.logo;
    img.style.display = 'block';
    txt.textContent = 'Logo loaded';
    btn.style.display = 'block';
  }
  renderItems();
  renderTotals();
  renderPreview();
  bindEvents();
  if (loaded) setTemplate(state.template || 't1');
  else setTemplate('t1');
}

init();

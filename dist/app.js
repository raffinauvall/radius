const state = { events: [], products: [], membership: null };
const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value).replace('Rp', 'Rp ');

async function loadData() {
  const response = await fetch('/api/catalog', { cache: 'no-store' });
  if (!response.ok) throw new Error('Catalog unavailable');
  Object.assign(state, await response.json());
  renderEvents(); renderProducts(); renderMembership();
}

function renderEvents() {
  $('#events-grid').innerHTML = state.events.length ? state.events.map((event, index) => `<article class="event-card">${event.imageUrl ? `<img class="event-art event-photo" src="${escapeHTML(event.imageUrl)}" alt="" />` : '<div class="event-art" aria-hidden="true"></div>'}<p class="eyebrow">${escapeHTML(event.category)} · ${escapeHTML(event.city)}</p><h3>${escapeHTML(event.name)}</h3><p>${escapeHTML(event.dateLabel)} · ${escapeHTML(event.distance)}</p><div class="event-card-bottom"><span class="event-price">From ${money(event.priceFrom)}</span><button class="small-button" type="button" data-event-id="${escapeHTML(event.id)}">Lihat event</button></div></article>`).join('') : '<p class="loading-state">Belum ada event yang dibuka. Cek kembali untuk jadwal berikutnya.</p>';
  document.querySelectorAll('[data-event-id]').forEach((button) => button.addEventListener('click', () => openEvent(button.dataset.eventId)));
}

function renderProducts() {
  $('#products-grid').innerHTML = state.products.length ? state.products.map((product) => `<article class="product-card"><div class="product-visual">${product.imageUrl ? `<img class="product-photo" src="${escapeHTML(product.imageUrl)}" alt="${escapeHTML(product.name)}" loading="lazy" />` : '<div class="product-swatch" aria-hidden="true"></div>'}</div><h3>${escapeHTML(product.name)}</h3><p>${money(product.price)} · ${escapeHTML(product.collection)}</p><button class="button button-dark product-buy" type="button" data-buy-product="${escapeHTML(product.id)}" ${product.stock === 0 ? 'disabled' : ''}>${product.stock === 0 ? 'Stok habis' : 'Beli'}</button></article>`).join('') : '<p class="loading-state">Belum ada merchandise yang tersedia.</p>';
}

function openCheckout(product) {
  if (!product) return;
  const dialog = $('#event-dialog');
  $('#event-dialog .eyebrow').textContent = 'MERCH CHECKOUT';
  $('#dialog-title').textContent = 'Pesan merchandise';
  $('#dialog-meta').textContent = `${product.name} · ${money(product.price)}`;
  $('#ticket-options').innerHTML = `<form id="merch-checkout" class="merch-checkout"><label>Jumlah<input name="quantity" type="number" min="1" max="${product.stock ?? 1000}" value="1" required /></label><p class="checkout-total">Total <strong data-checkout-total>${money(product.price)}</strong></p><label>Alamat pengiriman<textarea name="address" maxlength="1000" autocomplete="street-address" required></textarea></label><p class="demo-note">Checkout demo. Tidak ada pembayaran atau pengiriman yang diproses.</p><p class="checkout-error" role="alert" hidden></p><button class="button button-dark full-width" type="submit">Konfirmasi pesanan</button></form>`;
  dialog.dataset.productId = product.id;
  dialog.hidden = false; document.body.classList.add('modal-open'); dialog.querySelector('.dialog-close').focus();
}

async function buyProduct(id) {
  const product = state.products.find(item => item.id === id);
  if (!product) return;
  const session = await fetch('/api/session', { cache: 'no-store' });
  if (session.status === 401) {
    const next = `/index.html?buy=${encodeURIComponent(id)}#shop`;
    window.location.href = `/signin.html?next=${encodeURIComponent(next)}`;
    return;
  }
  if (!session.ok) { showToast('Belum bisa memeriksa akun. Coba lagi.'); return; }
  openCheckout(product);
}

function renderMembership() {
  $('#membership-plans').innerHTML = state.membership.plans.map((plan, index) => `<article class="plan ${index === 1 ? 'featured' : ''}"><div class="plan-head"><h3>${escapeHTML(plan.name)}</h3><span class="plan-price">${plan.price === 0 ? 'FREE' : money(plan.price) + (plan.interval ? '/' + plan.interval : '')}</span></div><p>${escapeHTML(plan.description)}</p></article>`).join('');
}

function openEvent(id) {
  const event = state.events.find((item) => item.id === id); if (!event) return;
  $('#event-dialog .eyebrow').textContent = 'EVENT TICKET';
  $('#dialog-title').textContent = event.name; $('#dialog-meta').textContent = `${event.dateLabel} · ${event.city} · ${event.distance}`;
  $('#ticket-options').innerHTML = event.tickets.map((ticket) => `<label class="ticket-option"><strong>${escapeHTML(ticket.name)}</strong><span>${money(ticket.price)}</span><input type="radio" name="ticket" value="${escapeHTML(ticket.name)}" ${ticket.default ? 'checked' : ''} /></label>`).join('');
  $('#event-dialog').hidden = false; document.body.classList.add('modal-open'); $('.dialog-close').focus();
}

function closeEvent() { $('#event-dialog').hidden = true; }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.hidden = false; window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 3200); }
document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-close-dialog], [data-demo-checkout], [data-join-membership], [data-buy-product], .menu-trigger');
  if (!target) return;
  if (target.matches('[data-close-dialog]')) closeEvent();
  if (target.matches('[data-demo-checkout]')) { closeEvent(); showToast('Demo checkout siap. Tidak ada pembayaran yang diproses.'); }
  if (target.matches('[data-join-membership]')) window.location.href = '/signup.html';
  if (target.matches('[data-buy-product]')) buyProduct(target.dataset.buyProduct).catch(() => showToast('Belum bisa membuka checkout. Coba lagi.'));
  if (target.matches('.menu-trigger')) { const menu = $('#mobile-menu'); const open = menu.hidden; menu.hidden = !open; target.setAttribute('aria-expanded', String(open)); }
});

document.addEventListener('submit', async event => {
  if (event.target.id !== 'merch-checkout') return;
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('button[type="submit"]');
  const error = form.querySelector('.checkout-error');
  button.disabled = true;
  try {
    const response = await fetch('/api/shop/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: $('#event-dialog').dataset.productId, quantity: Number(form.elements.quantity.value), address: form.elements.address.value.trim(), requestId: crypto.randomUUID() }) });
    const result = await response.json();
    if (response.status === 401) { window.location.href = `/signin.html?next=${encodeURIComponent(`/index.html?buy=${encodeURIComponent($('#event-dialog').dataset.productId)}#shop`)}`; return; }
    if (!response.ok) throw new Error(result.error || 'Pesanan belum bisa dibuat.');
    $('#dialog-title').textContent = 'Pesanan demo tercatat';
    $('#dialog-meta').textContent = result.order.id;
    $('#ticket-options').innerHTML = `<p>Pesanan ${escapeHTML(result.order.items[0].name)} sudah masuk ke akunmu.</p><p class="demo-note">Tidak ada pembayaran yang diproses. Pesanan ini hanya untuk demo dan belum dikirim.</p><a class="button button-dark full-width" href="/account.html#orders">Lihat pesanan</a>`;
    showToast('Pesanan demo tersimpan di akun.');
  } catch (cause) {
    error.textContent = cause.message === 'Failed to fetch' ? 'Koneksi terputus. Coba lagi.' : cause.message;
    error.hidden = false;
    button.disabled = false;
  }
});

document.addEventListener('input', event => {
  if (event.target.form?.id !== 'merch-checkout' || event.target.name !== 'quantity') return;
  const product = state.products.find(item => item.id === $('#event-dialog').dataset.productId);
  if (product) $('[data-checkout-total]').textContent = money(product.price * Math.max(1, Number(event.target.value) || 1));
});

document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeEvent(); });
loadData().then(() => {
  const resumedProduct = new URLSearchParams(location.search).get('buy');
  if (resumedProduct) fetch('/api/session', { cache: 'no-store' }).then(response => { if (response.ok) openCheckout(state.products.find(product => product.id === resumedProduct)); }).catch(() => {});
}).catch(() => { document.querySelectorAll('.loading-state').forEach((node) => { node.className = 'error-state'; node.textContent = 'Data demo gagal dimuat. Jalankan lewat local HTTP server, bukan file://.'; }); });

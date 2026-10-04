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
  $('#products-grid').innerHTML = state.products.length ? state.products.map((product) => `<article class="product-card"><div class="product-visual">${product.imageUrl ? `<img class="product-photo" src="${escapeHTML(product.imageUrl)}" alt="${escapeHTML(product.name)}" loading="lazy" />` : '<div class="product-swatch" aria-hidden="true"></div>'}</div><h3>${escapeHTML(product.name)}</h3><p>${money(product.price)} · ${escapeHTML(product.collection)}</p></article>`).join('') : '<p class="loading-state">Belum ada merchandise yang tersedia.</p>';
}

function renderMembership() {
  $('#membership-plans').innerHTML = state.membership.plans.map((plan, index) => `<article class="plan ${index === 1 ? 'featured' : ''}"><div class="plan-head"><h3>${escapeHTML(plan.name)}</h3><span class="plan-price">${plan.price === 0 ? 'FREE' : money(plan.price) + (plan.interval ? '/' + plan.interval : '')}</span></div><p>${escapeHTML(plan.description)}</p></article>`).join('');
}

function openEvent(id) {
  const event = state.events.find((item) => item.id === id); if (!event) return;
  $('#dialog-title').textContent = event.name; $('#dialog-meta').textContent = `${event.dateLabel} · ${event.city} · ${event.distance}`;
  $('#ticket-options').innerHTML = event.tickets.map((ticket) => `<label class="ticket-option"><strong>${escapeHTML(ticket.name)}</strong><span>${money(ticket.price)}</span><input type="radio" name="ticket" value="${escapeHTML(ticket.name)}" ${ticket.default ? 'checked' : ''} /></label>`).join('');
  $('#event-dialog').hidden = false; document.body.classList.add('modal-open'); $('.dialog-close').focus();
}

function closeEvent() { $('#event-dialog').hidden = true; }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.hidden = false; window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 3200); }
document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-close-dialog], [data-demo-checkout], [data-join-membership], .menu-trigger');
  if (!target) return;
  if (target.matches('[data-close-dialog]')) closeEvent();
  if (target.matches('[data-demo-checkout]')) { closeEvent(); showToast('Demo checkout siap. Tidak ada pembayaran yang diproses.'); }
  if (target.matches('[data-join-membership]')) window.location.href = '/signup.html';
  if (target.matches('.menu-trigger')) { const menu = $('#mobile-menu'); const open = menu.hidden; menu.hidden = !open; target.setAttribute('aria-expanded', String(open)); }
});

document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeEvent(); });
loadData().catch(() => { document.querySelectorAll('.loading-state').forEach((node) => { node.className = 'error-state'; node.textContent = 'Data demo gagal dimuat. Jalankan lewat local HTTP server, bukan file://.'; }); });

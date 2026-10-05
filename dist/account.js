const root = document.querySelector('[data-account-root]');
const dialog = document.querySelector('[data-member-dialog]');
const escapeHTML = (value) => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
let customer;
let ticketFilter = 'all';
let toastTimer;
let ticketRequest = 0;
let qrURL;

const icons = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  tickets: '<path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6Z"/><path d="M15 6v3m0 3v1m0 3v2"/>',
  orders: '<path d="M5 7h14l2 13H3L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
  membership: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-13 5h4m5-1v3m-1.5-1.5h3"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${icons[name]}</svg>`;
const views = { overview: 'Overview', tickets: 'My tickets', orders: 'My orders', membership: 'Membership', profile: 'Profile' };
document.querySelector('#member-nav').innerHTML = Object.entries(views).map(([key, label]) => `<a href="#${key}" data-nav="${key}">${icon(key)}<span>${label}</span></a>`).join('');

const badge = status => `<span class="member-badge ${status === 'ATTENDED' || status === 'DELIVERED' ? 'badge-neutral' : ''}">${escapeHTML({ VALID: 'Upcoming', ATTENDED: 'Attended', DELIVERED: 'Delivered', SHIPPED: 'Shipped', CANCELLED: 'Cancelled', PENDING: 'Pending', PAID: 'Paid', PROCESSING: 'Processing', DEMO: 'Demo · belum dibayar' }[status] || status)}</span>`;
const empty = (title, message, link = '/index.html#events', label = 'Lihat event') => `<div class="member-state"><h2>${title}</h2><p>${message}</p><a class="member-button" href="${link}">${label}</a></div>`;
const pageHead = (title, description, action = '') => `<div class="member-page-heading"><div><h1>${escapeHTML(title)}</h1><p>${escapeHTML(description)}</p></div>${action}</div>`;
const sectionHead = (title, link, label) => `<div class="member-section-heading"><h2>${title}</h2>${link ? `<a class="member-text-action" href="${link}">${label}</a>` : ''}</div>`;
const ticketRows = tickets => tickets.map(ticket => `<li class="member-list-row"><div class="row-date"><strong>${escapeHTML(ticket.day)}</strong><span>${escapeHTML(ticket.month)}</span></div><div class="row-description"><strong>${escapeHTML(ticket.event)}</strong><span>${escapeHTML(ticket.city)} · ${escapeHTML(ticket.type)}</span></div>${badge(ticket.status)}<button class="member-outline-button" type="button" data-ticket="${escapeHTML(ticket.id)}">Detail tiket</button></li>`).join('');
const orderRows = orders => orders.map(order => `<li class="member-list-row"><div class="order-symbol">${icon('orders')}</div><div class="row-description"><strong>${escapeHTML(order.item)}</strong><span>${escapeHTML(order.id)} · ${escapeHTML(order.date)}</span></div><span class="order-total">${money(order.total)}</span>${badge(order.status)}<button class="member-outline-button" type="button" data-order="${escapeHTML(order.id)}">Detail order</button></li>`).join('');
const person = () => customer;
async function saveAccount(path, data) {
  const response = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Perubahan gagal disimpan. Coba lagi.');
  customer = result;
}

function updateIdentity() {
  const user = person();
  const initial = escapeHTML(user.name.slice(0, 1).toUpperCase());
  document.querySelector('[data-sidebar-person]').innerHTML = `<span class="member-avatar">${initial}</span><div><strong>${escapeHTML(user.name)}</strong><span>${escapeHTML(customer.membership.name)} member</span></div>`;
}

function overview() {
  const user = person();
  const next = customer.tickets.find(ticket => ticket.status === 'VALID');
  const later = customer.tickets.filter(ticket => ticket.status === 'VALID' && ticket !== next);
  const order = customer.orderHistory[0];
  const paused = customer.membershipCancelAtEnd;
  return pageHead(`Hai, ${user.name}.`, 'Siap untuk ketemu di run berikutnya?', '<a class="member-text-action" href="/index.html#events">Cari event berikutnya</a>') +
    `<div class="account-overview"><div class="overview-tickets"><section>${sectionHead('Tiket terdekat', '#tickets', 'Semua tiket')}${next ? `<article class="event-pass"><div class="pass-date"><strong>${escapeHTML(next.day)}</strong><span>${escapeHTML(next.month)}</span><small>${escapeHTML(next.date.split(' ').at(-1))}</small></div><div class="pass-content"><div class="pass-context"><span>${escapeHTML(next.partner)}</span>${badge(next.status)}</div><h2>${escapeHTML(next.event)}</h2><p>${escapeHTML(next.date)}<br />${escapeHTML(next.city)} · ${escapeHTML(next.distance)}</p><div class="pass-bottom"><div><strong>${escapeHTML(next.type)}</strong><small>${escapeHTML(next.code)}</small></div><button class="member-button" type="button" data-ticket="${escapeHTML(next.id)}">Buka tiket</button></div></div></article>` : empty('Belum ada tiket berikutnya', 'Cari event Radius dan pilih kegiatan berikutnya.')}</section><section class="later-events">${sectionHead('Jadwal berikutnya')}${later.length ? `<ul class="member-data-list">${ticketRows(later)}</ul>` : '<p class="section-note">Belum ada event lain yang kamu ikuti.</p>'}<a class="member-text-action" href="#tickets">Lihat tiket dan riwayat kehadiran</a></section><p class="account-history">${customer.eventsAttended} event dihadiri · ${customer.ticketsPurchased} tiket dibeli · ${customer.orders} pesanan merch</p></div><aside class="account-summary" aria-label="Ringkasan akun"><section class="membership-summary">${sectionHead('Membership')}${badge(paused && customer.membership.price ? 'Berakhir segera' : 'Aktif')}<h2>${escapeHTML(customer.membership.name)}</h2><p>${customer.membership.price ? `${paused ? 'Aktif sampai' : 'Perpanjangan berikutnya'}<br /><strong>${escapeHTML(customer.membership.renewalDate)}</strong>` : 'Paket gratis.<br />Tidak ada tagihan berkala.'}</p><a class="member-text-action" href="#membership">Benefit dan pengaturan</a></section><section class="latest-order">${sectionHead('Pesanan terakhir')}${order ? `<div class="last-order-status">${badge(order.status)}<span>${escapeHTML(order.date)}</span></div><h3>${escapeHTML(order.item)}</h3><p>${escapeHTML(order.id)}</p><div class="last-order-bottom"><strong>${money(order.total)}</strong><button class="member-outline-button" type="button" data-order="${escapeHTML(order.id)}">Detail order</button></div><a class="member-text-action" href="#orders">Semua pesanan</a>` : '<p class="section-note">Belum ada pesanan merch.</p><a class="member-text-action" href="/index.html#shop">Lihat shop</a>'}</section></aside></div>`;
}

function tickets() {
  const filtered = customer.tickets.filter(ticket => ticketFilter === 'all' || ticket.status === ticketFilter);
  return pageHead('My tickets', 'Semua tiket dan riwayat event kamu.', '<a class="member-button" href="/index.html#events">Cari event</a>') +
    `<div class="member-filter" role="group" aria-label="Filter tiket">${[['all', 'Semua'], ['VALID', 'Upcoming'], ['ATTENDED', 'Attended']].map(([key, label]) => `<button type="button" data-filter="${key}" aria-pressed="${ticketFilter === key}">${label} <span>${customer.tickets.filter(t => key === 'all' || t.status === key).length}</span></button>`).join('')}</div>` +
    `<section class="member-surface">${filtered.length ? `<ul class="member-data-list">${ticketRows(filtered)}</ul>` : empty('Belum ada tiket di kategori ini', 'Tiket kamu akan muncul di sini setelah pendaftaran event.')}</section>`;
}

function orders() {
  return pageHead('My orders', 'Cek detail pembelian dan status pengiriman merch kamu.', '<a class="member-outline-button" href="/index.html#shop">Lihat shop</a>') +
    `<section class="member-surface">${sectionHead('Riwayat pesanan')} ${customer.orderHistory.length ? `<ul class="member-data-list">${orderRows(customer.orderHistory)}</ul>` : empty('Belum ada pesanan', 'Produk yang kamu beli akan muncul di sini.', '/index.html#shop', 'Lihat shop')}</section>`;
}

function membership() {
  const paused = customer.membershipCancelAtEnd;
  const paid = customer.membership.price > 0;
  return pageHead('Membership', 'Benefit dan informasi paket kamu.') +
    `<div class="member-overview-grid"><section class="member-surface membership-settings">${badge(paused && paid ? 'Berakhir segera' : 'Aktif')}<h2>${escapeHTML(customer.membership.name)}</h2><p>${paid ? `${money(customer.membership.price)} / ${escapeHTML(customer.membership.interval || 'bulan')}` : 'Gratis. Tidak ada tagihan berkala.'}</p>${paid ? `<dl class="member-detail-list"><div><dt>${paused ? 'Aktif sampai' : 'Perpanjangan'}</dt><dd>${escapeHTML(customer.membership.renewalDate)}</dd></div><div><dt>Perpanjangan otomatis</dt><dd>${paused ? 'Nonaktif' : 'Aktif'}</dd></div></dl><button class="member-outline-button" type="button" data-renewal>${paused ? 'Aktifkan perpanjangan' : 'Kelola perpanjangan'}</button>` : '<a class="member-text-action" href="/index.html#membership">Lihat pilihan membership</a>'}</section><section class="member-surface membership-benefits">${sectionHead(`Benefit ${escapeHTML(customer.membership.name)}`)}<ul class="member-benefits">${customer.membership.benefits.map(b => `<li><span aria-hidden="true">✓</span><div><strong>${escapeHTML(b.title)}</strong><p>${escapeHTML(b.description)}</p></div></li>`).join('')}</ul><a class="member-text-action" href="/index.html#events">Lihat event yang tersedia</a></section></div>`;
}

function profile() {
  const user = person();
  return pageHead('Profile', 'Perbarui informasi akun yang digunakan untuk tiket dan pesanan.') +
    `<section class="member-surface profile-surface"><div class="profile-intro"><span class="member-avatar avatar-large">${escapeHTML(user.name.slice(0, 1).toUpperCase())}</span><div><h2>${escapeHTML(user.name)}</h2><p>${escapeHTML(customer.membership.name)} member</p></div></div><form class="member-profile-form" data-profile-form><label>Nama lengkap<input name="name" value="${escapeHTML(user.name)}" autocomplete="name" maxlength="80" required /></label><label>Email<input name="email" type="email" value="${escapeHTML(user.email)}" readonly /><small>Email akun tidak dapat diubah dari form ini.</small></label><label>Nomor WhatsApp<input name="phone" type="tel" value="${escapeHTML(user.phone || '')}" autocomplete="tel" placeholder="08..." maxlength="25" /></label><div class="profile-form-footer"><p data-profile-message role="status"></p><button class="member-button" type="submit">Simpan perubahan</button></div></form></section>`;
}

function render() {
  if (!customer) return;
  const key = Object.hasOwn(views, location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
  document.title = `${views[key]} | Radius Society`;
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.classList.toggle('selected', link.dataset.nav === key);
    if (link.dataset.nav === key) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  root.innerHTML = ({ overview, tickets, orders, membership, profile })[key]();
  document.querySelector('.member-sidebar').classList.remove('menu-open');
  document.querySelector('.member-menu').setAttribute('aria-expanded', 'false');
  updateIdentity();
}

function openDetail(title, content) {
  document.querySelector('#member-dialog-title').textContent = title;
  document.querySelector('[data-dialog-content]').innerHTML = content;
  if (!dialog.open) dialog.showModal();
}
async function openTicket(id) {
  const request = ++ticketRequest;
  const initial = customer.tickets.find(ticket => ticket.id === id);
  if (!initial) return;
  openDetail(initial.event, '<p role="status">Memuat tiket dan barcode...</p>');
  try {
    const response = await fetch('/api/account', { cache: 'no-store' });
    if (!response.ok) throw new Error('Tiket belum bisa dimuat. Coba lagi.');
    customer = await response.json();
    const ticket = customer.tickets.find(ticket => ticket.id === id);
    if (!ticket) throw new Error('Tiket tidak ditemukan.');
    if (!dialog.open || request !== ticketRequest) return;
    const usable = ticket.status === 'VALID' && !ticket.entryConsumed;
    openDetail(ticket.event, `<div class="detail-status">${badge(ticket.status)}</div>${usable ? `<section class="ticket-code"><h3>Barcode masuk</h3><p>Tunjukkan QR ini ke petugas. Berlaku untuk satu kali check-in.</p><img data-ticket-qr alt="QR tiket ${escapeHTML(ticket.code)}" width="360" height="360" hidden /><p data-qr-state role="status">Memuat barcode...</p><button class="member-button" type="button" data-download-ticket="${escapeHTML(id)}" disabled>Download tiket (PNG)</button></section>` : `<p class="ticket-code-notice">${ticket.entryConsumed || ticket.status === 'ATTENDED' ? 'Tiket sudah dipakai untuk check-in. Barcode tidak bisa digunakan lagi.' : 'Tiket dibatalkan. Barcode tidak berlaku.'}</p>`}<dl class="member-detail-list"><div><dt>Ticket ID</dt><dd>${escapeHTML(ticket.code)}</dd></div><div><dt>Nama peserta</dt><dd>${escapeHTML(person().name)}</dd></div><div><dt>Tanggal</dt><dd>${escapeHTML(ticket.date)}</dd></div><div><dt>Lokasi</dt><dd>${escapeHTML(ticket.city)}</dd></div><div><dt>Jenis tiket</dt><dd>${escapeHTML(ticket.type)}</dd></div>${ticket.checkedInAt ? `<div><dt>Check-in</dt><dd>${escapeHTML(new Date(ticket.checkedInAt).toLocaleString('id-ID'))}</dd></div>` : ''}</dl><button class="member-outline-button" type="button" data-print>Cetak tiket</button>`);
    if (usable) {
      const image = await fetch(`/api/tickets/${encodeURIComponent(id)}/qr`, { cache: 'no-store' });
      if (!image.ok) throw new Error((await image.json()).error || 'Barcode belum bisa dimuat.');
      const blob = await image.blob();
      if (!dialog.open || request !== ticketRequest) return;
      if (qrURL) URL.revokeObjectURL(qrURL);
      qrURL = URL.createObjectURL(blob);
      const node = dialog.querySelector('[data-ticket-qr]');
      await new Promise((resolve, reject) => { node.onload = resolve; node.onerror = () => reject(new Error('Barcode belum bisa ditampilkan.')); node.src = qrURL; });
      if (!dialog.open || request !== ticketRequest) return;
      node.hidden = false; dialog.querySelector('[data-qr-state]').textContent = ''; dialog.querySelector('[data-download-ticket]').disabled = false;
    }
  } catch (error) {
    if (!dialog.open || request !== ticketRequest) return;
    const state = dialog.querySelector('[data-qr-state]');
    if (state) { state.textContent = error.message; state.className = 'ticket-code-notice'; }
    else document.querySelector('[data-dialog-content]').innerHTML = `<p class="ticket-code-notice" role="alert">${escapeHTML(error.message)}</p>`;
    document.querySelector('[data-dialog-content]').insertAdjacentHTML('beforeend', `<button class="member-outline-button" type="button" data-ticket="${escapeHTML(id)}">Muat ulang tiket</button>`);
  }
}
async function downloadTicket(id, button) {
  button.disabled = true; const label = button.textContent; button.textContent = 'Menyiapkan PNG...';
  let url;
  try {
    const response = await fetch(`/api/tickets/${encodeURIComponent(id)}/qr`, { cache: 'no-store' });
    if (!response.ok) throw new Error((await response.json()).error || 'Download tiket gagal.');
    url = URL.createObjectURL(await response.blob());
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Barcode belum bisa dimuat.')); image.src = url; });
    const ticket = customer.tickets.find(ticket => ticket.id === id);
    const canvas = document.createElement('canvas'); canvas.width = 660; canvas.height = 860;
    const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, 660, 860); context.fillStyle = '#19191b'; context.textAlign = 'center';
    context.font = 'bold 28px Arial'; context.fillText('RADIUS SOCIETY', 330, 45);
    context.font = '20px Arial'; context.fillText(ticket.event, 330, 82, 600); context.fillText(`${ticket.date} · ${ticket.city}`, 330, 112, 600);
    context.imageSmoothingEnabled = false; context.drawImage(image, 30, 135, 600, 600);
    context.font = 'bold 23px Arial'; context.fillText(ticket.code, 330, 765, 600);
    context.font = '18px Arial'; context.fillText(person().name, 330, 799, 600); context.fillText('Berlaku untuk satu kali check-in.', 330, 831, 600);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Download tiket gagal. Coba lagi.');
    const downloadURL = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = downloadURL; link.download = `${ticket.code}.png`; link.click(); setTimeout(() => URL.revokeObjectURL(downloadURL), 1000);
  } catch (error) { toast(error.message); }
  finally { if (url) URL.revokeObjectURL(url); button.disabled = false; button.textContent = label; }
}

function toast(message) {
  const node = document.querySelector('[data-member-toast]');
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 4000);
}

document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.matches('[data-signout]')) {
    button.disabled = true;
    try {
      const response = await fetch('/api/signout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error('Sign out failed');
      localStorage.removeItem('radius_session'); location.href = '/signin.html';
    } catch { button.disabled = false; toast('Sign out gagal. Coba lagi.'); }
    return;
  }
  if (button.matches('.member-menu')) {
    const open = document.querySelector('.member-sidebar').classList.toggle('menu-open');
    button.setAttribute('aria-expanded', String(open));
  }
  if (button.hasAttribute('data-close-dialog')) dialog.close();
  if (button.dataset.filter) { ticketFilter = button.dataset.filter; render(); root.querySelector(`[data-filter="${ticketFilter}"]`).focus(); }
  if (button.dataset.ticket) {
    await openTicket(button.dataset.ticket);
  }
  if (button.dataset.downloadTicket) await downloadTicket(button.dataset.downloadTicket, button);
  if (button.dataset.order) {
    const order = customer.orderHistory.find(o => o.id === button.dataset.order);
    if (!order) return;
    openDetail(`Order ${order.id}`, `<div class="detail-status">${badge(order.status)}</div><dl class="member-detail-list"><div><dt>Produk</dt><dd>${escapeHTML(order.item)}</dd></div><div><dt>Tanggal pembelian</dt><dd>${escapeHTML(order.date)}</dd></div><div><dt>Jumlah</dt><dd>${order.quantity}</dd></div><div><dt>Total</dt><dd>${money(order.total)}</dd></div><div><dt>Alamat pengiriman</dt><dd>${escapeHTML(order.address || 'Belum diisi')}</dd></div><div><dt>Nomor resi</dt><dd>${escapeHTML(order.tracking || 'Belum tersedia')}</dd></div></dl>`);
  }
  if (button.hasAttribute('data-print')) window.print();
  if (button.hasAttribute('data-renewal')) {
    const paused = customer.membershipCancelAtEnd;
    openDetail('Perpanjangan Radius+', `<p>${paused ? 'Aktifkan kembali perpanjangan Radius+?' : `Hentikan perpanjangan otomatis? Benefit tetap aktif sampai ${escapeHTML(customer.membership.renewalDate)}.`}</p><div class="dialog-actions"><button class="member-outline-button" type="button" data-close-dialog>Kembali</button><button class="member-button" type="button" data-confirm-renewal>${paused ? 'Aktifkan perpanjangan' : 'Hentikan perpanjangan'}</button></div>`);
  }
  if (button.hasAttribute('data-confirm-renewal')) {
    button.disabled = true;
    button.textContent = 'Menyimpan...';
    try {
      await saveAccount('/api/account/membership', { cancelAtEnd: !customer.membershipCancelAtEnd });
      dialog.close(); render(); root.querySelector('[data-renewal]').focus(); toast('Pengaturan perpanjangan diperbarui.');
    } catch (error) { toast(error.message); }
    finally { button.disabled = false; button.textContent = customer.membershipCancelAtEnd ? 'Aktifkan perpanjangan' : 'Hentikan perpanjangan'; }
  }
  if (button.hasAttribute('data-retry')) loadAccount();
});

document.addEventListener('submit', async event => {
  if (!event.target.matches('[data-profile-form]')) return;
  event.preventDefault();
  const form = event.target;
  const name = form.elements.name.value.trim();
  if (!name) { form.elements.name.setCustomValidity('Isi nama lengkap.'); form.elements.name.reportValidity(); return; }
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  form.querySelector('[data-profile-message]').textContent = 'Menyimpan perubahan...';
  try {
    await saveAccount('/api/account/profile', { name, phone: form.elements.phone.value.trim() });
    updateIdentity();
    document.querySelector('.profile-intro h2').textContent = name;
    document.querySelector('.avatar-large').textContent = name.slice(0, 1).toUpperCase();
    form.querySelector('[data-profile-message]').textContent = 'Perubahan tersimpan.';
  } catch (error) { form.querySelector('[data-profile-message]').textContent = error.message; }
  finally { button.disabled = false; }
});
document.addEventListener('input', event => { if (event.target.name === 'name') event.target.setCustomValidity(''); });
window.addEventListener('hashchange', () => { render(); root.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); });
dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
dialog.addEventListener('close', () => { ticketRequest++; if (qrURL) URL.revokeObjectURL(qrURL); qrURL = null; });

async function loadAccount() {
  root.innerHTML = '<div class="member-state" role="status">Memuat tiket dan aktivitas akun...</div>';
  try {
    const sessionResponse = await fetch('/api/session', { cache: 'no-store' });
    if (sessionResponse.status === 401) { localStorage.removeItem('radius_session'); location.replace('/signin.html'); return; }
    if (!sessionResponse.ok) throw new Error('Session unavailable');
    const response = await fetch('/api/account', { cache: 'no-store' });
    if (!response.ok) throw new Error('Account unavailable');
    customer = await response.json();
    customer.tickets ||= [];
    customer.orderHistory ||= [];
    render();
  } catch {
    root.innerHTML = '<div class="member-state" role="alert"><h2>Akun belum bisa dimuat</h2><p>Cek koneksi lalu coba muat kembali.</p><button class="member-button" type="button" data-retry>Coba lagi</button></div>';
  }
}
loadAccount();

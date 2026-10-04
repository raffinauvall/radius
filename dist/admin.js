const root = document.querySelector('[data-admin-root]');
const editor = document.querySelector('[data-editor]');
const labels = { overview: 'Ringkasan', products: 'Merchandise', events: 'Events', tickets: 'Tiket & check-in', orders: 'Orders', users: 'Users' };
const singular = { products: 'produk', events: 'event', tickets: 'tiket', orders: 'order', users: 'user' };
const statusLabels = { ACTIVE: 'Aktif', DISABLED: 'Nonaktif', ADMIN: 'Admin', USER: 'Member', VALID: 'Upcoming', ATTENDED: 'Attended', CANCELLED: 'Cancelled', PENDING: 'Pending', PAID: 'Paid', PROCESSING: 'Processing', SHIPPED: 'Shipped', DELIVERED: 'Delivered', active: 'Tampil', hidden: 'Disembunyikan', archived: 'Arsip' };
const plans = { COMMUNITY: 'Radius Community', PLUS: 'Radius+', YEARLY: 'Radius+ Yearly' };
const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
let store;
let search = '';
let status = 'all';
let eventFilter = '';
let pageNumber = 1;
let editorState;
let previewURL;
let toastTimer;
let scanner;
let scannerLibrary;
const currentView = () => Object.hasOwn(labels, location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
const userName = id => store.users.find(user => user.id === id)?.name || 'User tidak tersedia';
const tag = state => `<span class="admin-tag ${['PENDING', 'CANCELLED', 'DISABLED', 'hidden', 'archived'].includes(state) ? 'tag-warning' : ''}">${escapeHTML(statusLabels[state] || state)}</span>`;
const recordState = item => item.archived ? 'archived' : item.active ? 'active' : 'hidden';
const editButton = (kind, id, label = 'Edit') => `<button class="admin-outline" type="button" data-edit="${kind}" data-id="${escapeHTML(id)}">${label}</button>`;
const field = (label, name, value = '', type = 'text', extra = '') => `<label>${label}<input type="${type}" name="${name}" value="${escapeHTML(value)}" ${extra} /></label>`;
const select = (label, name, values, value = '', extra = '') => `<label>${label}<select name="${name}" ${extra}>${values.map(([key, text]) => `<option value="${escapeHTML(key)}" ${String(key) === String(value) ? 'selected' : ''}>${escapeHTML(text)}</option>`).join('')}</select></label>`;
const userOptions = () => store.users.filter(user => user.status !== 'DISABLED').map(user => [user.id, `${user.name} (${user.email})`]);
const orderStatuses = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
async function api(path, { method = 'GET', data, file } = {}) {
  const response = await fetch(path, { method, cache: 'no-store', ...(data || file ? { headers: { 'Content-Type': file ? file.type : 'application/json' }, body: file || JSON.stringify(data) } : {}) });
  const result = await response.json();
  if (response.status === 401) { location.href = '/signin.html?v=10'; throw new Error('Silakan sign in kembali.'); }
  if (!response.ok) throw new Error(result.error || 'Request gagal. Coba lagi.');
  return result;
}
function toast(message) {
  const node = document.querySelector('[data-admin-toast]');
  node.textContent = message; node.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { node.hidden = true; }, 4000);
}
function pageHead(title, description, actions = '') {
  return `<div class="admin-page-heading"><div><h1>${escapeHTML(title)}</h1><p>${escapeHTML(description)}</p></div>${actions}</div>`;
}
function overview() {
  const pending = store.orders.filter(order => ['PENDING', 'PAID', 'PROCESSING'].includes(order.status));
  const upcoming = store.events.filter(event => event.active && !event.archived && event.startsAt >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return pageHead('Operasional Radius', 'Kelola pendaftaran event, katalog merchandise, dan pesanan dari satu tempat.', '<a class="admin-outline" href="/?v=10">Lihat website</a>') +
    `<div class="admin-overview"><section class="operation-queue"><h2>${pending.length ? `${pending.length} order perlu ditangani` : 'Semua order sudah ditangani'}</h2><p>${pending.length ? 'Cek pembayaran tercatat dan lanjutkan proses pengiriman.' : 'Tidak ada order pending atau menunggu diproses saat ini.'}</p><ul class="queue-list">${pending.slice(0, 5).map(order => `<li><div><strong>${escapeHTML(order.id)}</strong><small>${escapeHTML(userName(order.customerId))} · ${money(order.total)}</small></div>${editButton('orders', order.id, 'Proses order')}</li>`).join('')}</ul><a class="admin-link" href="#orders">Buka semua orders</a></section><section class="admin-overview-summary"><h2>Data operasional</h2><dl><div><dt>Merchandise tampil</dt><dd>${store.products.filter(item => item.active && !item.archived).length}</dd></div><div><dt>Event dibuka</dt><dd>${store.events.filter(item => item.active && !item.archived).length}</dd></div><div><dt>Member aktif</dt><dd>${store.users.filter(user => user.role === 'USER' && user.status === 'ACTIVE').length}</dd></div><div><dt>Tiket valid</dt><dd>${store.tickets.filter(ticket => ticket.status === 'VALID').length}</dd></div></dl><a class="admin-link" href="#tickets">Buka tiket & check-in</a></section></div><section class="admin-upcoming"><h2>Event berikutnya</h2><ul class="admin-event-list">${upcoming.slice(0, 4).map(event => `<li><div><strong>${escapeHTML(event.name)}</strong><small>${escapeHTML(event.dateLabel)} · ${escapeHTML(event.city)}</small></div><button class="admin-outline" type="button" data-roster="${escapeHTML(event.id)}">Daftar peserta</button></li>`).join('') || '<li class="form-note">Belum ada event yang dibuka.</li>'}</ul></section>`;
}
const descriptions = { products: 'Atur foto, harga, collection, stok, dan visibilitas merchandise.', events: 'Atur jadwal, poster, lokasi, harga tiket, dan kuota pendaftaran.', tickets: 'Cari tiket, lihat peserta, terbitkan tiket, dan catat check-in.', orders: 'Kelola item pesanan, status, alamat pengiriman, dan nomor resi.', users: 'Kelola akun, role, password, status akses, dan membership.' };
function listPage(kind) {
  const filters = kind === 'products' || kind === 'events' ? ['active', 'hidden', 'archived'] : kind === 'users' ? ['ACTIVE', 'DISABLED'] : kind === 'tickets' ? ['VALID', 'ATTENDED', 'CANCELLED'] : orderStatuses;
  return pageHead(labels[kind], descriptions[kind], `<div class="admin-actions">${kind === 'tickets' ? '<button class="admin-button" type="button" data-open-scanner>Scan barcode</button>' : ''}<button class="admin-outline" type="button" data-export>Export CSV</button><button class="${kind === 'tickets' ? 'admin-outline' : 'admin-button'}" type="button" data-create="${kind}">${kind === 'tickets' ? 'Terbitkan tiket' : `Tambah ${singular[kind]}`}</button></div>`) +
    `<div class="admin-controls"><label>Cari ${singular[kind]}<input type="search" data-search value="${escapeHTML(search)}" placeholder="Cari nama, email, atau nomor..." /></label><label>Status<select data-status><option value="all">Semua status</option>${filters.map(value => `<option value="${value}" ${status === value ? 'selected' : ''}>${escapeHTML(statusLabels[value])}</option>`).join('')}</select></label>${kind === 'tickets' ? `<label>Event<select data-event-filter><option value="">Semua event</option>${store.events.map(event => `<option value="${escapeHTML(event.id)}" ${eventFilter === event.id ? 'selected' : ''}>${escapeHTML(event.name)}</option>`).join('')}</select></label>` : ''}</div><div data-records-region>${tableView(kind)}</div>`;
}
function records(kind) {
  return store[kind].filter(item => {
    const value = kind === 'products' || kind === 'events' ? recordState(item) : item.status;
    const extra = item.customerId ? userName(item.customerId) + ' ' + (store.users.find(user => user.id === item.customerId)?.email || '') : '';
    return (status === 'all' || value === status) && (!eventFilter || kind !== 'tickets' || item.eventId === eventFilter) && (JSON.stringify(item) + extra).toLowerCase().includes(search.toLowerCase());
  });
}
function imageName(record, secondary) {
  return `<div class="record-image">${record.imageUrl ? `<img src="${escapeHTML(record.imageUrl)}" alt="" loading="lazy" />` : '<span class="image-missing">Belum ada foto</span>'}<div><strong>${escapeHTML(record.name)}</strong><small>${escapeHTML(secondary)}</small></div></div>`;
}
function rowCells(kind, item) {
  if (kind === 'products') return [imageName(item, item.collection), money(item.price), item.stock === null ? 'Belum dicatat' : item.stock, tag(recordState(item)), `<div class="admin-actions">${editButton(kind, item.id, item.archived ? 'Pulihkan / edit' : 'Edit')}${!item.archived ? `<button class="admin-outline" type="button" data-archive="${kind}" data-id="${escapeHTML(item.id)}">Arsipkan</button>` : ''}</div>`];
  if (kind === 'events') return [imageName(item, item.city), escapeHTML(item.dateLabel), `${store.tickets.filter(ticket => ticket.eventId === item.id && ticket.status !== 'CANCELLED').length} tiket<small>${item.tickets.map(type => escapeHTML(type.name)).join(', ')}</small>`, tag(recordState(item)), `<div class="admin-actions">${editButton(kind, item.id)}<button class="admin-outline" type="button" data-roster="${escapeHTML(item.id)}">Peserta</button>${!item.archived ? `<button class="admin-outline" type="button" data-archive="${kind}" data-id="${escapeHTML(item.id)}">Arsipkan</button>` : ''}</div>`];
  if (kind === 'users') return [`<strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.email)}</small>`, tag(item.role), escapeHTML(plans[item.membershipPlan] || plans.COMMUNITY), tag(item.status), editButton(kind, item.id)];
  if (kind === 'tickets') return [`<strong>${escapeHTML(item.code)}</strong><small>${escapeHTML(userName(item.customerId))}</small>`, `${escapeHTML(item.event)}<small>${escapeHTML(item.date)}</small>`, `${escapeHTML(item.type)}<small>${money(item.price || 0)}</small>`, tag(item.status), `<div class="admin-actions">${editButton(kind, item.id, 'Detail / status')}${item.status === 'VALID' ? `<button class="admin-button" type="button" data-checkin="${escapeHTML(item.id)}">Check-in</button>` : ''}</div>`];
  return [`<strong>${escapeHTML(item.id)}</strong><small>${escapeHTML(userName(item.customerId))} · ${escapeHTML(item.date)}</small>`, item.items.map(line => `${escapeHTML(line.name)} × ${line.quantity}`).join('<br />'), money(item.total), tag(item.status), `<div class="admin-actions"><button class="admin-outline" type="button" data-order-detail="${escapeHTML(item.id)}">Detail</button>${editButton(kind, item.id)}</div>`];
}
function tableView(kind) {
  const all = records(kind);
  const maxPage = Math.max(1, Math.ceil(all.length / 10));
  pageNumber = Math.min(pageNumber, maxPage);
  const columns = { products: ['Produk', 'Harga', 'Stok', 'Status', 'Aksi'], events: ['Event', 'Tanggal', 'Pendaftaran', 'Status', 'Aksi'], users: ['User', 'Role', 'Membership', 'Akses', 'Aksi'], tickets: ['Tiket / peserta', 'Event', 'Jenis', 'Status', 'Aksi'], orders: ['Order / pemesan', 'Item', 'Total', 'Status', 'Aksi'] }[kind];
  const rows = all.slice((pageNumber - 1) * 10, pageNumber * 10);
  return `<div class="admin-table-wrap">${rows.length ? `<table class="admin-table"><caption class="sr-only">Daftar ${escapeHTML(labels[kind])}</caption><thead><tr>${columns.map(column => `<th scope="col">${column}</th>`).join('')}</tr></thead><tbody>${rows.map(item => `<tr>${rowCells(kind, item).map((cell, index) => `<td data-label="${columns[index]}">${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>` : `<div class="admin-state"><h2>${store[kind].length ? 'Tidak ada hasil yang cocok' : `Belum ada ${singular[kind]}`}</h2><p>${store[kind].length ? 'Ubah kata pencarian atau filter status.' : `Gunakan tombol tambah untuk membuat ${singular[kind]} pertama.`}</p></div>`}<div class="admin-pagination"><span>${all.length} record · Halaman ${pageNumber} dari ${maxPage}</span><div><button class="admin-outline" type="button" data-page="${pageNumber - 1}" ${pageNumber <= 1 ? 'disabled' : ''}>Sebelumnya</button><button class="admin-outline" type="button" data-page="${pageNumber + 1}" ${pageNumber >= maxPage ? 'disabled' : ''}>Berikutnya</button></div></div></div>`;
}
function render() {
  if (!store) return;
  const view = currentView();
  document.title = `${labels[view]} | Radius Admin`;
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.classList.toggle('selected', link.dataset.nav === view);
    if (link.dataset.nav === view) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  document.querySelector('[data-admin-identity]').innerHTML = `<strong>${escapeHTML(store.currentUser.name)}</strong><span>${escapeHTML(store.currentUser.email)}</span>`;
  root.innerHTML = view === 'overview' ? overview() : listPage(view);
  document.querySelector('.admin-sidebar').classList.remove('menu-open');
  document.querySelector('.admin-menu').setAttribute('aria-expanded', 'false');
}
async function loadData() {
  root.innerHTML = '<div class="admin-state" role="status">Memuat data operasional Radius...</div>';
  try { store = await api('/api/admin/data'); render(); }
  catch (error) { store = null; root.innerHTML = `<div class="admin-state" role="alert"><h2>Admin belum bisa dibuka</h2><p>${escapeHTML(error.message)}</p><div class="admin-actions"><button class="admin-outline" type="button" data-retry>Coba lagi</button><a class="admin-link" href="/account.html?v=8">Kembali ke akun</a></div></div>`; }
}
function formFooter() { return '<p class="form-error" role="alert" data-form-error></p><div class="editor-footer"><button class="admin-outline" type="button" data-close-editor>Batal</button><button class="admin-button" type="submit">Simpan</button></div>'; }
function showEditor(title, html) {
  document.querySelector('#editor-title').textContent = title;
  document.querySelector('[data-editor-body]').innerHTML = html;
  if (!editor.open) editor.showModal();
  else editor.querySelector('input,select,textarea,button')?.focus();
}
function imageEditor(imageUrl) {
  return `<fieldset><legend>Gambar</legend><div class="editor-image"><img data-image-preview ${imageUrl ? `src="${escapeHTML(imageUrl)}"` : 'hidden'} alt="Preview gambar" /><div><label>Upload gambar<input name="image" type="file" accept="image/png,image/jpeg,image/webp" /><small>JPG, PNG, atau WebP. Maksimal 5 MB.</small></label><button class="admin-outline" type="button" data-remove-image>Hapus gambar dari record</button></div></div></fieldset>`;
}
function ticketTypeLine(type = {}) {
  return `<div class="editor-line" data-ticket-type>${field('Nama jenis', 'ticketName', type.name || '', 'text', 'required maxlength="80"')}${field('Harga (Rp)', 'ticketPrice', type.price ?? 0, 'number', 'required min="0" step="1"')}${field('Kuota', 'ticketCapacity', type.capacity ?? '', 'number', 'min="0" step="1" placeholder="Tanpa batas"')}<button class="admin-outline admin-danger" type="button" data-remove-line aria-label="Hapus jenis tiket">Hapus</button></div>`;
}
function orderLine(item = {}) {
  const products = store.products.filter(product => !product.archived || product.id === item.productId).map(product => [product.id, `${product.name} (${money(product.price)})`]);
  return `<div class="editor-line" data-order-item>${select('Produk', 'productId', [['', 'Pilih produk'], ...products], item.productId, 'required')}${field('Jumlah', 'quantity', item.quantity || 1, 'number', 'min="1" max="1000" step="1" required')}<div><small>Harga mengikuti produk saat order dibuat.</small></div><button class="admin-outline admin-danger" type="button" data-remove-line aria-label="Hapus item order">Hapus</button></div>`;
}
function openForm(kind, id) {
  const item = id ? store[kind].find(record => record.id === id) : {};
  if (!item) return;
  editorState = { kind, id, imageUrl: item.imageUrl || '' };
  if (kind === 'tickets' && item.entryConsumed) {
    showEditor('Detail tiket', `<div class="admin-detail">${tag(item.status)}<p class="form-note">Tiket sudah dipakai. Barcode dan status masuk tidak bisa diaktifkan ulang.</p><dl>${[['Nomor tiket', item.code], ['Peserta', userName(item.customerId)], ['Event', item.event], ['Check-in', item.checkedInAt ? new Date(item.checkedInAt).toLocaleString('id-ID') : 'Riwayat kehadiran sebelumnya']].map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl><button class="admin-outline" type="button" data-close-editor>Tutup</button></div>`);
    return;
  }
  let fields;
  if (kind === 'products') fields = `<div class="admin-form-grid">${field('Nama produk', 'name', item.name, 'text', 'required maxlength="150"')}${field('Collection', 'collection', item.collection, 'text', 'required maxlength="100"')}${field('Harga (Rp)', 'price', item.price ?? 0, 'number', 'required min="0" step="1"')}${field('Stok tersedia', 'stock', item.stock ?? '', 'number', 'min="0" step="1" placeholder="Belum dicatat"')}<label class="span-full">Deskripsi<textarea name="description" maxlength="4000">${escapeHTML(item.description)}</textarea></label></div><p class="form-note">Stok dicatat manual. Perubahan order tidak mengubah stok secara otomatis.</p>${imageEditor(item.imageUrl)}<label class="admin-checkbox"><input type="checkbox" name="active" ${item.active !== false ? 'checked' : ''} />Tampilkan produk di shop</label>`;
  else if (kind === 'events') fields = `<div class="admin-form-grid">${field('Nama event', 'name', item.name, 'text', 'required maxlength="150"')}${field('Kategori', 'category', item.category, 'text', 'required maxlength="80"')}${field('Tanggal', 'startsAt', item.startsAt, 'date', 'required')}${field('Kota', 'city', item.city, 'text', 'required maxlength="100"')}${field('Lokasi / venue', 'venue', item.venue, 'text', 'maxlength="200"')}${field('Jarak / format', 'distance', item.distance, 'text', 'maxlength="100"')}<label class="span-full">Deskripsi<textarea name="description" maxlength="4000">${escapeHTML(item.description)}</textarea></label></div>${imageEditor(item.imageUrl)}<fieldset><legend>Jenis tiket & kuota</legend><div class="editor-lines" data-ticket-types>${(item.tickets || [{ name: 'Regular', price: 0, capacity: null }]).map(ticketTypeLine).join('')}</div><button class="admin-outline" type="button" data-add-ticket-type>Tambah jenis tiket</button><p class="form-note">Kosongkan kuota untuk tanpa batas. Jenis yang sudah digunakan tiket tidak bisa dihapus atau diganti namanya.</p></fieldset><label class="admin-checkbox"><input type="checkbox" name="active" ${item.active !== false ? 'checked' : ''} />Buka event di website</label>`;
  else if (kind === 'users') fields = `<div class="admin-form-grid">${field('Nama lengkap', 'name', item.name, 'text', 'required maxlength="80"')}${field('Email', 'email', item.email, 'email', 'required maxlength="254"')}${select('Role', 'role', [['USER', 'Member'], ['ADMIN', 'Admin']], item.role || 'USER')}${select('Status akses', 'status', [['ACTIVE', 'Aktif'], ['DISABLED', 'Nonaktif']], item.status || 'ACTIVE')}${select('Membership', 'membershipPlan', Object.entries(plans), item.membershipPlan || 'COMMUNITY')}${field('Tanggal perpanjangan', 'membershipRenewalDate', item.membershipRenewalDate || '', 'date')}${field(id ? 'Password baru (opsional)' : 'Password', 'password', '', 'password', `${id ? '' : 'required'} maxlength="128" autocomplete="new-password"`)}</div><p class="form-note">${id ? 'Kosongkan password untuk mempertahankan password lama. Perubahan password membatalkan sesi user.' : 'User baru langsung bisa sign in dengan email dan password ini.'} Nonaktifkan akses untuk menjaga riwayat transaksi tetap tersimpan.</p>`;
  else if (kind === 'tickets') fields = id ? `<div class="admin-detail"><dl><div><dt>Nomor tiket</dt><dd>${escapeHTML(item.code)}</dd></div><div><dt>Peserta</dt><dd>${escapeHTML(userName(item.customerId))}</dd></div><div><dt>Event</dt><dd>${escapeHTML(item.event)}</dd></div><div><dt>Jenis</dt><dd>${escapeHTML(item.type)}</dd></div><div><dt>Tanggal</dt><dd>${escapeHTML(item.date)}</dd></div></dl></div>${select('Status tiket', 'status', [['VALID', 'Upcoming'], ['ATTENDED', 'Attended / sudah check-in'], ['CANCELLED', 'Cancelled']], item.status)}` : `<div class="admin-form-grid">${select('Peserta', 'customerId', [['', 'Pilih user'], ...userOptions()], '', 'required')}${select('Event', 'eventId', [['', 'Pilih event'], ...store.events.filter(event => event.active && !event.archived).map(event => [event.id, event.name])], eventFilter, 'required')}${select('Jenis tiket', 'type', [['', 'Pilih event terlebih dahulu']], '', 'required')}</div><p class="form-note">Tiket diterbitkan untuk user yang dipilih. Aksi ini tidak memproses pembayaran.</p>`;
  else fields = `${id ? `<p class="form-note">${escapeHTML(item.id)} · ${escapeHTML(userName(item.customerId))}</p>` : select('Pemesan', 'customerId', [['', 'Pilih user'], ...userOptions()], '', 'required')}<fieldset><legend>Item order</legend><div class="editor-lines" data-order-items>${(item.items || [{}]).map(orderLine).join('')}</div><button class="admin-outline" type="button" data-add-order-item>Tambah item</button></fieldset><div class="admin-form-grid">${select('Status order', 'status', orderStatuses.map(value => [value, statusLabels[value]]), item.status || 'PENDING')}${field('Nomor resi', 'tracking', item.tracking, 'text', 'maxlength="100"')}<label class="span-full">Alamat pengiriman<textarea name="address" maxlength="1000">${escapeHTML(item.address)}</textarea></label><label class="span-full">Catatan internal<textarea name="notes" maxlength="2000">${escapeHTML(item.notes)}</textarea></label></div><p class="form-note">Total dihitung dari item order. Perubahan status mencatat operasional, bukan pembayaran atau refund otomatis.</p>`;
  showEditor(`${id ? 'Edit' : kind === 'tickets' ? 'Terbitkan' : 'Tambah'} ${singular[kind]}`, `<form class="admin-form" data-editor-form>${fields}${formFooter()}</form>`);
  if (kind === 'tickets' && !id) updateTicketTypes();
  if (kind === 'users') editor.querySelector('[name=membershipRenewalDate]').required = (item.membershipPlan || 'COMMUNITY') !== 'COMMUNITY';
}
function updateTicketTypes() {
  const form = editor.querySelector('form');
  const event = store.events.find(event => event.id === form.elements.eventId.value);
  form.elements.type.innerHTML = event ? event.tickets.map(type => `<option value="${escapeHTML(type.name)}">${escapeHTML(type.name)} (${money(type.price)})</option>`).join('') : '<option value="">Pilih event terlebih dahulu</option>';
}
function openOrderDetail(id) {
  const order = store.orders.find(order => order.id === id);
  showEditor(`Order ${order.id}`, `<div class="admin-detail"><div>${tag(order.status)}</div><dl>${[['Pemesan', userName(order.customerId)], ['Tanggal', order.date], ['Total', money(order.total)], ['Alamat', order.address || 'Belum diisi'], ['Nomor resi', order.tracking || 'Belum diisi'], ['Catatan', order.notes || 'Tidak ada']].map(([key, value]) => `<div><dt>${key}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl><h3>Item order</h3><ul>${order.items.map(item => `<li>${escapeHTML(item.name)} × ${item.quantity} (${money(item.unitPrice)})</li>`).join('')}</ul><div class="admin-actions">${editButton('orders', id)}<button class="admin-outline" type="button" data-close-editor>Tutup</button></div></div>`);
}
function redrawRecords() { root.querySelector('[data-records-region]').innerHTML = tableView(currentView()); }
function formData(form) {
  const data = Object.fromEntries(new FormData(form));
  const { kind, id, imageUrl } = editorState;
  if (kind === 'products') return { name: data.name, collection: data.collection, price: Number(data.price), stock: data.stock === '' ? null : Number(data.stock), description: data.description, imageUrl, active: form.elements.active.checked };
  if (kind === 'events') return { name: data.name, category: data.category, startsAt: data.startsAt, city: data.city, venue: data.venue, distance: data.distance, description: data.description, imageUrl, active: form.elements.active.checked, tickets: [...form.querySelectorAll('[data-ticket-type]')].map(line => ({ name: line.querySelector('[name=ticketName]').value, price: Number(line.querySelector('[name=ticketPrice]').value), capacity: line.querySelector('[name=ticketCapacity]').value === '' ? null : Number(line.querySelector('[name=ticketCapacity]').value) })) };
  if (kind === 'users') return { name: data.name, email: data.email, role: data.role, status: data.status, membershipPlan: data.membershipPlan, membershipRenewalDate: data.membershipRenewalDate || null, ...(data.password ? { password: data.password } : {}) };
  if (kind === 'tickets') return id ? { status: data.status } : { customerId: data.customerId, eventId: data.eventId, type: data.type };
  return { ...(!id ? { customerId: data.customerId } : {}), status: data.status, address: data.address, tracking: data.tracking, notes: data.notes, items: [...form.querySelectorAll('[data-order-item]')].map(line => ({ productId: line.querySelector('[name=productId]').value, quantity: Number(line.querySelector('[name=quantity]').value) })) };
}
function confirmAction(kind, id, action) {
  const record = store[kind].find(item => item.id === id);
  const checkIn = action === 'checkin';
  editorState = { kind, id, action };
  showEditor(checkIn ? 'Check-in peserta' : `Arsipkan ${singular[kind]}?`, `<form class="admin-form" data-confirm-form><p><strong>${escapeHTML(checkIn ? userName(record.customerId) : record.name)}</strong></p><p>${checkIn ? `${escapeHTML(record.event)}<br />${escapeHTML(record.code)}<br />Status tiket akan menjadi Attended.` : 'Record disembunyikan dari website. Riwayat transaksi tetap tersimpan dan record dapat dipulihkan lewat Edit.'}</p><p class="form-error" role="alert" data-form-error></p><div class="editor-footer"><button class="admin-outline" type="button" data-close-editor>Batal</button><button class="admin-button" type="submit">${checkIn ? 'Konfirmasi check-in' : 'Arsipkan'}</button></div></form>`);
}
function exportCSV() {
  const kind = currentView();
  const columns = { products: ['id', 'name', 'collection', 'price', 'stock', 'active', 'archived'], events: ['id', 'name', 'startsAt', 'city', 'venue', 'active', 'archived'], users: ['id', 'name', 'email', 'role', 'status', 'membershipPlan', 'membershipRenewalDate'], tickets: ['id', 'code', 'customer', 'event', 'type', 'price', 'status'], orders: ['id', 'customer', 'date', 'total', 'status', 'tracking', 'address'] }[kind];
  const quote = value => { const text = String(value ?? ''); return `"${(/^[=+\-@\t\r\n]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`; };
  const csv = [columns, ...records(kind).map(record => columns.map(key => key === 'customer' ? userName(record.customerId) : record[key]))].map(row => row.map(quote).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `radius-${kind}-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`${records(kind).length} record diexport sesuai filter.`);
}
document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.matches('.admin-menu')) {
    const open = document.querySelector('.admin-sidebar').classList.toggle('menu-open'); button.setAttribute('aria-expanded', String(open));
  } else if (button.hasAttribute('data-close-editor')) { if (editor.getAttribute('aria-busy') !== 'true') editor.close(); }
  else if (button.hasAttribute('data-open-scanner')) openScanner();
  else if (button.hasAttribute('data-start-camera')) await startScannerCamera();
  else if (button.hasAttribute('data-stop-camera')) { stopScannerCamera(); scanMessage('Kamera dihentikan. Mulai lagi untuk scan, atau gunakan gambar QR / kode tiket.'); }
  else if (button.hasAttribute('data-retry')) await loadData();
  else if (button.dataset.create) openForm(button.dataset.create);
  else if (button.dataset.edit) openForm(button.dataset.edit, button.dataset.id);
  else if (button.dataset.archive) confirmAction(button.dataset.archive, button.dataset.id, 'archive');
  else if (button.dataset.checkin) confirmAction('tickets', button.dataset.checkin, 'checkin');
  else if (button.dataset.roster) {
    eventFilter = button.dataset.roster; search = ''; status = 'all'; pageNumber = 1;
    if (location.hash === '#tickets') render(); else location.hash = 'tickets';
  } else if (button.dataset.orderDetail) openOrderDetail(button.dataset.orderDetail);
  else if (button.hasAttribute('data-add-ticket-type')) editor.querySelector('[data-ticket-types]').insertAdjacentHTML('beforeend', ticketTypeLine());
  else if (button.hasAttribute('data-add-order-item')) editor.querySelector('[data-order-items]').insertAdjacentHTML('beforeend', orderLine());
  else if (button.hasAttribute('data-remove-line')) {
    const line = button.closest('.editor-line');
    if (line.parentElement.children.length > 1) line.remove(); else editor.querySelector('[data-form-error]').textContent = 'Minimal satu item harus tetap ada.';
  } else if (button.hasAttribute('data-remove-image')) {
    editorState.imageUrl = ''; editor.querySelector('[name=image]').value = '';
    const preview = editor.querySelector('[data-image-preview]'); preview.hidden = true; preview.removeAttribute('src');
    if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; }
  } else if (button.hasAttribute('data-page')) { pageNumber = Number(button.dataset.page); redrawRecords(); root.querySelector('[data-records-region]').scrollIntoView({ block: 'start' }); root.querySelector('[data-page]:not(:disabled)')?.focus({ preventScroll: true }); }
  else if (button.hasAttribute('data-export')) exportCSV();
  else if (button.hasAttribute('data-admin-signout')) {
    button.disabled = true;
    try { await api('/api/signout', { method: 'POST', data: {} }); location.href = '/signin.html?v=10'; }
    catch (error) { toast(error.message); button.disabled = false; }
  }
});
document.addEventListener('input', event => {
  if (event.target.hasAttribute('data-search')) { search = event.target.value; pageNumber = 1; redrawRecords(); }
});
document.addEventListener('change', event => {
  const input = event.target;
  if (input.name === 'scanEventId') { stopScannerCamera(); scanMessage('Event dipilih. Mulai kamera, pilih gambar QR, atau masukkan kode tiket.'); }
  else if (input.name === 'scanImage') readScannerImage(input);
  else if (input.hasAttribute('data-status')) { status = input.value; pageNumber = 1; redrawRecords(); }
  else if (input.hasAttribute('data-event-filter')) { eventFilter = input.value; pageNumber = 1; redrawRecords(); }
  else if (input.name === 'eventId' && editorState?.kind === 'tickets') updateTicketTypes();
  else if (input.name === 'membershipPlan') {
    const date = editor.querySelector('[name=membershipRenewalDate]'); date.required = input.value !== 'COMMUNITY';
    if (!date.required) date.value = '';
  } else if (input.name === 'image') {
    const file = input.files[0]; const error = editor.querySelector('[data-form-error]'); error.textContent = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { error.textContent = 'Gunakan JPG, PNG, atau WebP dengan ukuran maksimal 5 MB.'; input.value = ''; return; }
    if (previewURL) URL.revokeObjectURL(previewURL);
    previewURL = URL.createObjectURL(file);
    const preview = editor.querySelector('[data-image-preview]'); preview.src = previewURL; preview.hidden = false;
  }
});
document.addEventListener('submit', async event => {
  const form = event.target;
  if (!form.matches('[data-editor-form], [data-confirm-form]')) return;
  event.preventDefault();
  if (editor.getAttribute('aria-busy') === 'true') return;
  const submit = form.querySelector('[type=submit]'); const label = submit.textContent; const state = { ...editorState };
  const error = form.querySelector('[data-form-error]'); error.textContent = '';
  editor.setAttribute('aria-busy', 'true'); submit.disabled = true; submit.textContent = 'Menyimpan...';
  try {
    if (form.matches('[data-editor-form]')) {
      const file = form.querySelector('[name=image]')?.files[0];
      if (file) { const uploaded = await api('/api/admin/images', { method: 'POST', file }); editorState.imageUrl = uploaded.imageUrl; form.querySelector('[name=image]').value = ''; }
      await api(`/api/admin/${state.kind}${state.id ? '/' + state.id : ''}`, { method: state.id ? 'PATCH' : 'POST', data: formData(form) });
    } else await api(`/api/admin/${state.kind}/${state.id}`, state.action === 'checkin' ? { method: 'PATCH', data: { status: 'ATTENDED' } } : { method: 'DELETE' });
    editor.close();
    store = await api('/api/admin/data'); search = ''; status = 'all'; pageNumber = 1; render();
    root.querySelector('[data-create]')?.focus({ preventScroll: true });
    toast(state.action === 'checkin' ? 'Check-in tercatat.' : state.action === 'archive' ? 'Record diarsipkan. Riwayat tetap tersimpan.' : `${singular[state.kind]} berhasil disimpan.`);
  } catch (failure) {
    if (editor.open) { error.textContent = failure.message; error.tabIndex = -1; error.focus(); }
    else toast(failure.message);
  } finally { editor.removeAttribute('aria-busy'); submit.disabled = false; submit.textContent = label; }
});
editor.addEventListener('cancel', event => { if (editor.getAttribute('aria-busy') === 'true') event.preventDefault(); });
editor.addEventListener('close', () => {
  if (previewURL) URL.revokeObjectURL(previewURL); previewURL = null;
  if (scanner) { stopScannerCamera(); scanner = null; render(); root.querySelector('[data-open-scanner]')?.focus({ preventScroll: true }); }
});
function scannerReader() {
  if (window.ZXingBrowser) return Promise.resolve(new window.ZXingBrowser.BrowserQRCodeReader());
  scannerLibrary ||= new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = '/vendor/zxing-browser.min.js';
    script.onload = resolve;
    script.onerror = () => { scannerLibrary = null; script.remove(); reject(new Error('Scanner belum bisa dimuat. Coba lagi atau gunakan kode tiket.')); };
    document.head.append(script);
  });
  return scannerLibrary.then(() => new window.ZXingBrowser.BrowserQRCodeReader());
}
function scanMessage(message, error = false) {
  const node = editor.querySelector('[data-scan-result]');
  if (!node) return;
  node.textContent = message; node.classList.toggle('scan-error', error);
}
function openScanner() {
  scanner = { busy: false, controls: null, run: 0 }; editorState = null;
  const events = store.events.filter(event => event.active && !event.archived);
  showEditor('Scan tiket masuk', `<div class="scan-panel">${select('Event check-in', 'scanEventId', [['', 'Pilih event'], ...events.map(event => [event.id, event.name])], eventFilter)}${!events.length ? '<p class="form-note">Belum ada event aktif. Buat atau buka event terlebih dahulu.</p>' : ''}<p class="form-note">Scan barcode QR yang ditampilkan peserta. Tiket hanya bisa dipakai satu kali.</p><div class="scan-preview"><video data-scan-video muted playsinline hidden></video></div><div class="admin-actions"><button class="admin-button" type="button" data-start-camera ${events.length ? '' : 'disabled'}>Mulai kamera</button><button class="admin-outline" type="button" data-stop-camera hidden>Hentikan kamera</button></div><p class="form-note">Kamera memerlukan izin browser dan HTTPS atau localhost.</p><label>Baca dari gambar QR<input name="scanImage" type="file" accept="image/png,image/jpeg,image/webp" ${events.length ? '' : 'disabled'} /><small>Gambar dibaca di perangkat ini, tidak diupload ke server. Maksimal 10 MB.</small></label><form data-scan-form><label>Kode tiket / barcode<input name="scanPayload" type="text" placeholder="Masukkan kode tiket" maxlength="200" autocomplete="off" required ${events.length ? '' : 'disabled'} /></label><button class="admin-outline" type="submit" ${events.length ? '' : 'disabled'}>Check-in dengan kode</button></form><p class="scan-feedback" role="status" aria-live="polite" data-scan-result>Pilih event sebelum scan tiket.</p><button class="admin-outline" type="button" data-close-editor>Tutup scanner</button></div>`);
}
function stopScannerCamera(state = scanner) {
  if (!state) return;
  state.run++; state.controls?.stop(); state.controls = null;
  const video = editor.querySelector('[data-scan-video]');
  video?.srcObject?.getTracks().forEach(track => track.stop());
  if (video) { video.srcObject = null; video.hidden = true; }
  const start = editor.querySelector('[data-start-camera]'); if (start) start.disabled = state.busy;
  const stop = editor.querySelector('[data-stop-camera]'); if (stop) stop.hidden = true;
}
async function startScannerCamera() {
  const state = scanner;
  if (!state || state.busy) return;
  if (!editor.querySelector('[name=scanEventId]').value) { scanMessage('Pilih event check-in terlebih dahulu.', true); return; }
  stopScannerCamera(state); const run = state.run;
  const start = editor.querySelector('[data-start-camera]'); start.disabled = true;
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Kamera membutuhkan HTTPS atau localhost. Gunakan gambar QR atau kode tiket sebagai cadangan.');
    scanMessage('Meminta izin kamera...');
    const reader = await scannerReader();
    if (scanner !== state || !editor.open || state.run !== run) return;
    const video = editor.querySelector('[data-scan-video]'); video.hidden = false;
    const controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } }, audio: false }, video, (result, error, controls) => {
      if (result && scanner === state && !state.busy && state.run === run) { state.controls = controls; scanPayload(result.getText()); }
    });
    if (scanner !== state || !editor.open || state.run !== run) { controls.stop(); return; }
    state.controls = controls; editor.querySelector('[data-stop-camera]').hidden = false; scanMessage('Kamera aktif. Arahkan ke QR tiket peserta.');
  } catch (error) {
    if (scanner === state && editor.open && state.run === run) {
      stopScannerCamera(state);
      scanMessage(({ NotAllowedError: 'Izin kamera ditolak. Izinkan kamera di browser, atau gunakan gambar QR / kode tiket.', NotFoundError: 'Kamera tidak ditemukan. Gunakan gambar QR atau kode tiket.', NotReadableError: 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu dan coba lagi.' })[error.name] || error.message, true);
    }
  }
}
async function readScannerImage(input) {
  const state = scanner; const file = input.files[0];
  if (!state || state.busy || !file) return;
  input.value = '';
  if (!editor.querySelector('[name=scanEventId]').value) { scanMessage('Pilih event check-in terlebih dahulu.', true); return; }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { scanMessage('Pilih JPG, PNG, atau WebP maksimal 10 MB.', true); return; }
  stopScannerCamera(state); state.busy = true;
  scanMessage('Membaca barcode dari gambar...'); const url = URL.createObjectURL(file);
  try {
    const reader = await scannerReader(); const result = await reader.decodeFromImageUrl(url);
    if (scanner !== state || !editor.open) return;
    state.busy = false; await scanPayload(result.getText());
  } catch (error) {
    if (scanner === state && editor.open) scanMessage(error.message?.includes('Scanner belum') ? error.message : 'QR tidak terbaca. Pilih gambar tiket yang jelas atau masukkan kode tiket.', true);
  } finally { URL.revokeObjectURL(url); state.busy = false; }
}
async function scanPayload(payload) {
  const state = scanner;
  if (!state || state.busy) return;
  const eventId = editor.querySelector('[name=scanEventId]').value;
  if (!eventId) { scanMessage('Pilih event check-in terlebih dahulu.', true); return; }
  state.busy = true; stopScannerCamera(state); editor.setAttribute('aria-busy', 'true');
  editor.querySelectorAll('.scan-panel input,.scan-panel select,.scan-panel button:not([data-close-editor])').forEach(node => { node.disabled = true; });
  scanMessage('Memvalidasi tiket dan menyimpan check-in...');
  try {
    const result = await api('/api/admin/check-in', { method: 'POST', data: { eventId, payload } });
    Object.assign(store.tickets.find(ticket => ticket.id === result.ticket.id) || {}, result.ticket);
    scanMessage(`Check-in berhasil: ${result.customerName}\n${result.ticket.event}\n${result.ticket.code} · ${new Date(result.ticket.checkedInAt).toLocaleString('id-ID')}\nTiket sudah digunakan. Scan ulang akan ditolak.`);
    editor.querySelector('[name=scanPayload]').value = '';
  } catch (error) { scanMessage(error.message === 'Failed to fetch' ? 'Koneksi terputus. Check-in belum terkonfirmasi; cek daftar tiket sebelum mencoba lagi.' : error.message, true); }
  finally {
    state.busy = false; editor.removeAttribute('aria-busy');
    editor.querySelectorAll('.scan-panel input,.scan-panel select,.scan-panel button').forEach(node => { node.disabled = false; });
    editor.querySelector('[data-start-camera]').textContent = 'Scan peserta berikutnya';
  }
}
document.addEventListener('submit', event => {
  if (!event.target.matches('[data-scan-form]')) return;
  event.preventDefault(); scanPayload(event.target.elements.scanPayload.value.trim());
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stopScannerCamera(); });
window.addEventListener('hashchange', () => { search = ''; status = 'all'; pageNumber = 1; if (currentView() !== 'tickets') eventFilter = ''; render(); root.focus({ preventScroll: true }); window.scrollTo(0, 0); });
loadData();

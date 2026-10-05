import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import qrcode from 'qrcode-generator';
import { state, withState, commit, getSession, putSession, deleteSession, deleteUserSessions, saveImage, readImage } from './storage.js';

const project = dirname(fileURLToPath(import.meta.url));
const publicRoot = resolve(project, 'dist');
const sessionAge = 8 * 60 * 60;
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const publicUser = ({ id, email, name, phone = '', role = 'USER', status = 'ACTIVE', membershipPlan = 'COMMUNITY', membershipRenewalDate = null, membershipCancelAtEnd = false, createdAt }) => ({ id, email, name, phone, role, status, membershipPlan, membershipRenewalDate, membershipCancelAtEnd, createdAt });
const cookie = (token, age = sessionAge) => `radius_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${process.env.VERCEL ? '; Secure' : ''}`;
const tokenFrom = req => req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('radius_session='))?.slice('radius_session='.length);
const send = (res, status, data, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(JSON.stringify(data));
};
const fail = (status, message) => Object.assign(new Error(message), { status });
async function signedIn(req) {
  const token = tokenFrom(req);
  const session = await getSession(token);
  if (!session || session.expiresAt < Date.now()) { await deleteSession(token); throw fail(401, 'Silakan sign in kembali.'); }
  const user = state().accounts.find(account => account.id === session.userId);
  if (!user || user.status === 'DISABLED' || session.credentialHash !== user.passwordHash) { await deleteSession(token); throw fail(401, 'Silakan sign in kembali.'); }
  return user;
}
async function startSession(req, res, user) {
  await deleteSession(tokenFrom(req));
  const token = randomBytes(32).toString('hex');
  await putSession(token, user, Date.now() + sessionAge * 1000);
  send(res, 200, { user: publicUser(user) }, { 'Set-Cookie': cookie(token) });
}
function passwordMatches(password, saved) {
  const [salt, hash] = saved.split(':');
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
const hashPassword = password => { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; };
function assertAdminUnchanged(admin) {
  const current = state().accounts.find(user => user.id === admin.id);
  if (!current || current.status === 'DISABLED' || current.role !== 'ADMIN' || current.passwordHash !== admin.passwordHash) throw fail(403, 'Akses admin berubah. Silakan sign in kembali.');
}
function consumeTicket(store, ticket, admin, eventId) {
  if (ticket.eventId !== eventId) throw fail(400, 'Tiket ini untuk event lain. Pilih event yang sesuai.');
  if (ticket.entryConsumed || ticket.status === 'ATTENDED') throw fail(409, 'Tiket sudah dipakai untuk check-in. Tidak bisa digunakan lagi.');
  if (ticket.status !== 'VALID') throw fail(400, 'Tiket dibatalkan. Check-in ditolak.');
  if (!store.events.some(event => event.id === eventId && event.active && !event.archived)) throw fail(400, 'Event tidak aktif. Check-in ditolak.');
  if (!state().accounts.some(user => user.id === ticket.customerId && user.status !== 'DISABLED')) throw fail(400, 'Akun peserta tidak aktif. Check-in ditolak.');
  const now = new Date().toISOString();
  Object.assign(ticket, { status: 'ATTENDED', entryConsumed: true, checkedInAt: now, checkedInBy: admin.id, updatedAt: now });
  return ticket;
}
async function scanTicket(data, admin) {
  const eventId = textField(data.eventId, 'Event', 100, true);
  const payload = textField(data.payload, 'Barcode atau kode tiket', 200, true);
  const token = payload.match(/^RADIUS1:([a-f0-9]{64})$/)?.[1];
  if (!token && !/^RAD[A-Z0-9-]{4,50}$/.test(payload)) throw fail(400, 'Barcode bukan tiket Radius. Scan QR tiket yang benar.');
  return commit('operations', store => {
    assertAdminUnchanged(admin);
    const ticket = store.tickets.find(ticket => token ? ticket.checkInToken === token : ticket.code === payload);
    if (!ticket) throw fail(404, 'Tiket tidak ditemukan. Check-in ditolak.');
    consumeTicket(store, ticket, admin, eventId);
    return { ticket: { id: ticket.id, code: ticket.code, eventId: ticket.eventId, event: ticket.event, type: ticket.type, status: ticket.status, entryConsumed: true, checkedInAt: ticket.checkedInAt, checkedInBy: admin.id }, customerName: state().accounts.find(user => user.id === ticket.customerId).name };
  });
}
async function ticketQR(req, res, id) {
  const user = await signedIn(req);
  const ticket = state().operations.tickets.find(ticket => ticket.id === id && ticket.customerId === user.id);
  if (!ticket) throw fail(404, 'Tiket tidak ditemukan.');
  if (ticket.status !== 'VALID' || ticket.entryConsumed) throw fail(409, 'Barcode tidak tersedia. Tiket sudah dipakai atau dibatalkan.');
  const qr = qrcode(0, 'M'); qr.addData(`RADIUS1:${ticket.checkInToken}`); qr.make();
  res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(qr.createSvgTag({ cellSize: 8, margin: 32 }));
}
const textField = (value, label, limit = 200, required = false) => {
  if (value == null && !required) return '';
  if (typeof value !== 'string' || value.trim().length > limit || (required && !value.trim())) throw fail(400, `${label} tidak valid.`);
  return value.trim();
};
const integer = (value, label, minimum = 0) => { if (!Number.isSafeInteger(value) || value < minimum || value > 1000000000) throw fail(400, `${label} tidak valid.`); return value; };
const optionalNumber = (value, label) => value === null || value === '' || value === undefined ? null : integer(value, label);
const dateLabel = date => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date)).toUpperCase();
const dateID = date => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));
const imageField = value => {
  const url = textField(value, 'Gambar', 150);
  if (url && !/^\/uploads\/[a-f\d-]{36}\.(png|jpg|webp)$/.test(url)) throw fail(400, 'Gunakan gambar yang diupload melalui admin.');
  return url;
};
function dateField(value, required = false) {
  if (!value && !required) return null;
  const parsed = new Date(value);
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw fail(400, 'Tanggal tidak valid.');
  return value;
}
async function bodyJSON(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw fail(415, 'Gunakan request JSON.');
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 65536) throw fail(413, 'Data terlalu panjang.');
  }
  try { const data = JSON.parse(body); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); return data; } catch { throw fail(400, 'Data tidak valid.'); }
}
async function accountData(user) {
  const tickets = state().operations.tickets.filter(ticket => ticket.customerId === user.id);
  const orderHistory = state().operations.orders.filter(order => order.customerId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(({ notes, requestId, ...order }) => ({ ...order, item: order.items.map(item => item.name).join(', '), quantity: order.items.reduce((n, item) => n + item.quantity, 0) }));
  const plan = state().membership.plans.find(plan => plan.key === (user.membershipPlan || 'COMMUNITY'));
  const membership = { ...plan, interval: plan.interval === 'year' ? 'tahun' : plan.interval === 'month' ? 'bulan' : null, renewalDate: user.membershipRenewalDate ? dateID(user.membershipRenewalDate) : null };
  return { ...publicUser(user), eventsAttended: tickets.filter(ticket => ticket.status === 'ATTENDED').length, ticketsPurchased: tickets.length, orders: orderHistory.length, tickets, orderHistory, membership };
}
async function adminUser(req) {
  const user = await signedIn(req);
  if (user.role !== 'ADMIN') throw fail(403, 'Akses hanya untuk admin Radius.');
  return user;
}
const choice = (value, allowed, label) => { if (!allowed.includes(value)) throw fail(400, `${label} tidak valid.`); return value; };
function productRecord(data) {
  return { name: textField(data.name, 'Nama produk', 150, true), price: integer(data.price, 'Harga'), collection: textField(data.collection, 'Collection', 100, true), stock: optionalNumber(data.stock, 'Stok'), description: textField(data.description, 'Deskripsi', 4000), imageUrl: imageField(data.imageUrl), active: choice(data.active ?? true, [true, false], 'Status produk') };
}
function eventRecord(data, store, id) {
  if (!Array.isArray(data.tickets) || !data.tickets.length || data.tickets.length > 20) throw fail(400, 'Tambahkan minimal satu jenis tiket.');
  const names = new Set();
  const tickets = data.tickets.map((ticket, index) => {
    const name = textField(ticket.name, 'Jenis tiket', 80, true);
    if (names.has(name.toLowerCase())) throw fail(400, 'Nama jenis tiket tidak boleh sama.');
    names.add(name.toLowerCase());
    const capacity = optionalNumber(ticket.capacity, 'Kuota tiket');
    const sold = store.tickets.filter(item => item.eventId === id && item.type === name && item.status !== 'CANCELLED').length;
    if (capacity !== null && capacity < sold) throw fail(400, `Kuota ${name} tidak boleh kurang dari ${sold} tiket yang sudah diterbitkan.`);
    return { name, price: integer(ticket.price, 'Harga tiket'), capacity, default: index === 0 };
  });
  for (const ticket of store.tickets.filter(item => item.eventId === id)) {
    if (!tickets.some(type => type.name === ticket.type)) throw fail(400, `Jenis ${ticket.type} sudah digunakan tiket; jangan hapus atau ubah namanya.`);
  }
  const startsAt = dateField(data.startsAt, true);
  return { name: textField(data.name, 'Nama event', 150, true), category: textField(data.category, 'Kategori', 80, true), city: textField(data.city, 'Kota', 100, true), startsAt, dateLabel: dateLabel(startsAt), distance: textField(data.distance, 'Jarak', 100), venue: textField(data.venue, 'Lokasi', 200), description: textField(data.description, 'Deskripsi', 4000), imageUrl: imageField(data.imageUrl), active: choice(data.active ?? true, [true, false], 'Status event'), tickets, priceFrom: Math.min(...tickets.map(ticket => ticket.price)) };
}
function ticketSnapshot(event, type) {
  return { event: event.name, category: event.category, partner: 'Radius Society', date: dateID(event.startsAt), day: event.startsAt.slice(8), month: dateLabel(event.startsAt).split(' ')[1], city: event.city, distance: event.distance, type: type.name, price: type.price };
}
function checkCapacity(store, event, type, exceptId) {
  const used = store.tickets.filter(ticket => ticket.id !== exceptId && ticket.eventId === event.id && ticket.type === type.name && ticket.status !== 'CANCELLED').length;
  if (type.capacity !== null && used >= type.capacity) throw fail(409, 'Kuota jenis tiket ini sudah penuh.');
}
async function uploadImage(req) {
  const mime = req.headers['content-type'];
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime)) throw fail(415, 'Gunakan gambar JPG, PNG, atau WebP.');
  const chunks = [];
  let length = 0;
  for await (const chunk of req) { length += chunk.length; if (length > 5 * 1024 * 1024) throw fail(413, 'Gambar maksimal 5 MB.'); chunks.push(chunk); }
  const image = Buffer.concat(chunks);
  const png = image.length >= 24 && image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && image.toString('ascii', 12, 16) === 'IHDR';
  const jpg = image.length >= 4 && image[0] === 255 && image[1] === 216 && image[2] === 255 && image.at(-2) === 255 && image.at(-1) === 217;
  const webp = image.length >= 20 && image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP' && image.readUInt32LE(4) + 8 === image.length;
  if (!(mime === 'image/png' && png) && !(mime === 'image/jpeg' && jpg) && !(mime === 'image/webp' && webp)) throw fail(400, 'File bukan gambar yang sesuai format.');
  const file = `${randomUUID()}.${png ? 'png' : jpg ? 'jpg' : 'webp'}`;
  await saveImage(file, mime, image);
  return { imageUrl: `/uploads/${file}` };
}
async function handleAdmin(req, res, path) {
  const admin = await adminUser(req);
  if (req.method === 'GET' && path === '/api/admin/data') return send(res, 200, { ...state().operations, users: state().accounts.map(publicUser), currentUser: publicUser(admin) });
  if (req.method === 'POST' && path === '/api/admin/images') return send(res, 201, await uploadImage(req));
  if (req.method === 'POST' && path === '/api/admin/check-in') return send(res, 200, await scanTicket(await bodyJSON(req), admin));
  const match = path.match(/^\/api\/admin\/(products|events|users|tickets|orders)(?:\/([\w-]+))?$/);
  if (!match || !['POST', 'PATCH', 'DELETE'].includes(req.method)) throw fail(404, 'Endpoint admin tidak ditemukan.');
  const [, kind, id] = match;
  if ((req.method === 'POST') === Boolean(id)) throw fail(400, 'Pilih record yang akan diperbarui.');
  const data = req.method === 'DELETE' ? {} : await bodyJSON(req);
  if (kind === 'users') {
    if (req.method === 'DELETE') throw fail(405, 'Nonaktifkan user untuk mempertahankan riwayat order dan tiket.');
    const result = await commit('accounts', store => {
      assertAdminUnchanged(admin);
      const previous = id ? store.find(user => user.id === id) : null;
      if (id && !previous) throw fail(404, 'User tidak ditemukan.');
      const draft = { ...previous, ...data };
      const email = textField(draft.email, 'Email', 254, true).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, 'Email tidak valid.');
      if (store.some(user => user.id !== id && user.email === email)) throw fail(409, 'Email sudah digunakan.');
      const role = choice(draft.role || 'USER', ['USER', 'ADMIN'], 'Role');
      const status = choice(draft.status || 'ACTIVE', ['ACTIVE', 'DISABLED'], 'Status user');
      const membershipPlan = choice(draft.membershipPlan || 'COMMUNITY', ['COMMUNITY', 'PLUS', 'YEARLY'], 'Membership');
      if (id === admin.id && (role !== 'ADMIN' || status !== 'ACTIVE')) throw fail(400, 'Akun admin yang sedang dipakai tidak bisa dinonaktifkan atau diturunkan role-nya.');
      if (previous?.role === 'ADMIN' && previous.status !== 'DISABLED' && (role !== 'ADMIN' || status === 'DISABLED') && store.filter(user => user.role === 'ADMIN' && user.status !== 'DISABLED').length <= 1) throw fail(400, 'Minimal satu admin aktif harus dipertahankan.');
      const password = data.password === undefined || data.password === '' ? '' : textField(data.password, 'Password', 128, true);
      if (!previous && !password) throw fail(400, 'Isi password untuk user baru.');
      const record = { ...previous, id: previous?.id || randomUUID(), name: textField(draft.name, 'Nama', 80, true), email, role, status, membershipPlan, membershipRenewalDate: membershipPlan === 'COMMUNITY' ? null : dateField(draft.membershipRenewalDate, true), passwordHash: password ? hashPassword(password) : previous.passwordHash, createdAt: previous?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (previous) store[store.indexOf(previous)] = record; else store.push(record);
      return publicUser(record);
    });
    if (data.password) await deleteUserSessions(result.id);
    return send(res, id ? 200 : 201, result);
  }
  const result = await commit('operations', store => {
    assertAdminUnchanged(admin);
    const list = store[kind];
    const previous = id ? list.find(record => record.id === id) : null;
    if (id && !previous) throw fail(404, 'Record tidak ditemukan.');
    const draft = { ...previous, ...data };
    const now = new Date().toISOString();
    let record;
    if (kind === 'products' || kind === 'events') {
      if (req.method === 'DELETE') {
        previous.active = false; previous.archived = true; previous.updatedAt = now;
        return previous;
      }
      record = { ...previous, ...(kind === 'products' ? productRecord(draft) : eventRecord(draft, store, id)), id: previous?.id || randomUUID(), archived: false, createdAt: previous?.createdAt || now, updatedAt: now };
      if (kind === 'events' && previous) for (const ticket of store.tickets.filter(ticket => ticket.eventId === id && ticket.status === 'VALID')) Object.assign(ticket, { ...ticketSnapshot(record, record.tickets.find(type => type.name === ticket.type)), price: ticket.price });
    } else if (kind === 'tickets') {
      if (req.method === 'DELETE') throw fail(405, 'Batalkan tiket melalui status untuk mempertahankan riwayat.');
      if (previous) {
        const status = choice(data.status, ['VALID', 'ATTENDED', 'CANCELLED'], 'Status tiket');
        if (previous.entryConsumed && status !== previous.status) throw fail(409, 'Tiket sudah dipakai. Status tidak bisa direset untuk masuk lagi.');
        if (status === 'ATTENDED') return consumeTicket(store, previous, admin, previous.eventId);
        if (previous.status === 'CANCELLED' && status !== 'CANCELLED') {
          const event = store.events.find(event => event.id === previous.eventId);
          const type = event?.tickets.find(type => type.name === previous.type);
          if (!event?.active || !type) throw fail(400, 'Event tidak tersedia.');
          checkCapacity(store, event, type, id);
        }
        record = { ...previous, status, updatedAt: now };
      } else {
        const user = state().accounts.find(user => user.id === data.customerId && user.status !== 'DISABLED');
        const event = store.events.find(event => event.id === data.eventId && event.active && !event.archived);
        const type = event?.tickets.find(type => type.name === data.type);
        if (!user || !event || !type) throw fail(400, 'Pilih user, event aktif, dan jenis tiket yang tersedia.');
        checkCapacity(store, event, type);
        record = { id: randomUUID(), code: `RAD-${randomBytes(5).toString('hex').toUpperCase()}`, checkInToken: randomBytes(32).toString('hex'), entryConsumed: false, customerId: user.id, eventId: event.id, ...ticketSnapshot(event, type), status: 'VALID', createdAt: now };
      }
    } else if (kind === 'orders') {
      if (req.method === 'DELETE') throw fail(405, 'Batalkan order melalui status untuk mempertahankan riwayat.');
      const customerId = previous?.customerId || draft.customerId;
      if (!state().accounts.some(user => user.id === customerId && (previous || user.status !== 'DISABLED'))) throw fail(400, 'Pilih user aktif.');
      if (!Array.isArray(draft.items) || !draft.items.length || draft.items.length > 30) throw fail(400, 'Tambahkan minimal satu item order.');
      const items = draft.items.map(item => {
        const product = store.products.find(product => product.id === item.productId);
        const existing = previous?.items.find(line => line.productId === item.productId);
        if (!product || ((!product.active || product.archived) && !existing)) throw fail(400, 'Produk tidak tersedia.');
        const quantity = integer(item.quantity, 'Jumlah produk', 1);
        if (quantity > 1000) throw fail(400, 'Jumlah produk maksimal 1000 per item.');
        return { productId: product.id, name: existing?.name || product.name, quantity, unitPrice: existing?.unitPrice ?? product.price };
      });
      if (new Set(items.map(item => item.productId)).size !== items.length) throw fail(400, 'Gabungkan jumlah untuk produk yang sama.');
      const createdAt = previous?.createdAt || now;
      record = { ...previous, id: previous?.id || `RAD-ORD-${randomBytes(4).toString('hex').toUpperCase()}`, customerId, items, total: integer(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), 'Total order'), status: choice(draft.status || 'PENDING', ['DEMO', 'PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'], 'Status order'), address: textField(draft.address, 'Alamat', 1000), tracking: textField(draft.tracking, 'Nomor resi', 100), notes: textField(draft.notes, 'Catatan', 2000), createdAt, date: previous?.date || dateID(createdAt), updatedAt: now };
    }
    if (previous) list[list.indexOf(previous)] = record; else list.unshift(record);
    return record;
  });
  return send(res, id ? 200 : 201, result);
}
async function handleRequest(req, res) {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path.startsWith('/api/')) {
      const protocol = process.env.VERCEL ? 'https' : 'http';
      if (['POST', 'PATCH', 'DELETE'].includes(req.method) && req.headers.origin && req.headers.origin !== `${protocol}://${req.headers.host}`) throw fail(403, 'Request tidak diizinkan.');
      if (path.startsWith('/api/admin/')) return await handleAdmin(req, res, path);
      if (req.method === 'GET' && path === '/api/catalog') return send(res, 200, { products: state().operations.products.filter(product => product.active && !product.archived), events: state().operations.events.filter(event => event.active && !event.archived), membership: state().membership });
      if (req.method === 'GET' && path === '/api/session') return send(res, 200, { user: publicUser(await signedIn(req)) });
      if (req.method === 'GET' && path === '/api/account') return send(res, 200, await accountData(await signedIn(req)));
      if (req.method === 'POST' && path === '/api/shop/orders') {
        const user = await signedIn(req);
        const data = await bodyJSON(req);
        const productId = textField(data.productId, 'Produk', 100, true);
        const quantity = integer(data.quantity, 'Jumlah produk', 1);
        const address = textField(data.address, 'Alamat pengiriman', 1000, true);
        const requestId = textField(data.requestId, 'ID checkout', 36, true);
        if (!/^[a-f\d-]{36}$/i.test(requestId)) throw fail(400, 'Checkout tidak valid. Coba lagi.');
        const order = await commit('operations', store => {
          const existing = store.orders.find(order => order.customerId === user.id && order.requestId === requestId);
          if (existing) return existing;
          const product = store.products.find(product => product.id === productId && product.active && !product.archived);
          if (!product) throw fail(404, 'Produk ini sudah tidak tersedia.');
          if (quantity > 1000 || (product.stock !== null && quantity > product.stock)) throw fail(409, 'Jumlah melebihi stok yang tersedia.');
          const now = new Date().toISOString();
          const record = { id: `RAD-ORD-${randomBytes(4).toString('hex').toUpperCase()}`, customerId: user.id, items: [{ productId, name: product.name, quantity, unitPrice: product.price }], total: product.price * quantity, status: 'DEMO', address, tracking: '', notes: 'Checkout demo. Pembayaran tidak diproses.', requestId, createdAt: now, date: dateID(now), updatedAt: now };
          store.orders.unshift(record);
          return record;
        });
        const { notes, requestId: _, ...publicOrder } = order;
        return send(res, 201, { order: publicOrder, paymentProcessed: false });
      }
      if (req.method === 'PATCH' && ['/api/account/profile', '/api/account/membership'].includes(path)) {
        const user = await signedIn(req);
        const data = await bodyJSON(req);
        const updated = await commit('accounts', accounts => {
          const current = accounts.find(account => account.id === user.id);
          if (!current || current.status === 'DISABLED' || current.passwordHash !== user.passwordHash) throw fail(401, 'Silakan sign in kembali.');
          if (path.endsWith('/profile')) {
            current.name = textField(data.name, 'Nama lengkap', 80);
            current.phone = textField(data.phone, 'Nomor WhatsApp', 25, true);
          } else {
            if (typeof data.cancelAtEnd !== 'boolean') throw fail(400, 'Pengaturan perpanjangan tidak valid.');
            if (!['PLUS', 'YEARLY'].includes(current.membershipPlan)) throw fail(400, 'Akun ini belum memiliki Radius+.');
            current.membershipCancelAtEnd = data.cancelAtEnd;
          }
          current.updatedAt = new Date().toISOString();
          return current;
        });
        return send(res, 200, await accountData(updated));
      }
      const qrRoute = path.match(/^\/api\/tickets\/([\w-]+)\/qr$/);
      if (req.method === 'GET' && qrRoute) return await ticketQR(req, res, qrRoute[1]);
      if (req.method !== 'POST') throw fail(404, 'Endpoint tidak ditemukan.');
      const data = await bodyJSON(req);
      if (path === '/api/signout') {
        await deleteSession(tokenFrom(req));
        return send(res, 200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
      }
      const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
      const password = typeof data.password === 'string' ? data.password : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length > 128) throw fail(400, 'Isi email dan password yang valid.');
      if (path === '/api/signin') {
        const user = state().accounts.find(account => account.email === email);
        if (!user || user.status === 'DISABLED' || !passwordMatches(password, user.passwordHash)) throw fail(401, 'Email atau password salah.');
        return await startSession(req, res, user);
      }
      if (path === '/api/signup') {
        const name = typeof data.name === 'string' ? data.name.trim() : '';
        if (!name || name.length > 80) throw fail(400, 'Isi nama lengkap (maksimal 80 karakter).');
        const user = await commit('accounts', store => {
          if (store.some(account => account.email === email)) throw fail(409, 'Email sudah terdaftar. Silakan sign in.');
          const user = { id: randomUUID(), email, name, role: 'USER', status: 'ACTIVE', membershipPlan: 'COMMUNITY', passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
          store.push(user);
          return user;
        });
        return await startSession(req, res, user);
      }
      throw fail(404, 'Endpoint tidak ditemukan.');
    }
    if (!['GET', 'HEAD'].includes(req.method)) throw fail(405, 'Method tidak diizinkan.');
    const isUpload = /^\/uploads\/[a-f\d-]{36}\.(png|jpg|webp)$/.test(path);
    const isScanner = path === '/vendor/zxing-browser.min.js';
    if (isUpload) {
      const image = await readImage(path.slice('/uploads/'.length));
      if (!image) throw fail(404, 'Gambar tidak ditemukan.');
      res.writeHead(200, { 'Content-Type': image.mime || types[extname(path)], 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
      return res.end(req.method === 'HEAD' ? undefined : image.content);
    }
    const file = isScanner ? resolve(project, 'node_modules/@zxing/browser/umd/zxing-browser.min.js') : resolve(publicRoot, `.${decodeURIComponent(path === '/' ? '/index.html' : path)}`);
    if (!isScanner && !file.startsWith(publicRoot + sep)) throw fail(404, 'Halaman tidak ditemukan.');
    let content;
    try { content = await readFile(file); } catch { throw fail(404, 'Halaman tidak ditemukan.'); }
    res.writeHead(200, { 'Content-Type': `${types[extname(file)] || 'application/octet-stream'}${['.html', '.css', '.js', '.json', '.svg'].includes(extname(file)) ? '; charset=utf-8' : ''}`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    if (!error.status) console.error('Radius request failed', error.code || error.name);
    send(res, error.status || 500, { error: error.status ? error.message : 'Server belum bisa memproses request. Coba lagi.' });
  }
}
export const server = createServer(async (req, res) => {
  try {
    if (new URL(req.url, 'http://localhost').pathname.startsWith('/api/')) await withState(() => handleRequest(req, res));
    else await handleRequest(req, res);
  } catch (error) {
    console.error('Radius storage failed', error.code || error.name);
    send(res, error.status || 503, { error: error.status ? error.message : 'Database belum bisa diakses. Coba lagi.' });
  }
});
if (!process.env.VERCEL) {
  const port = Number(process.argv[2] || process.env.PORT || 4176);
  server.listen(port, '127.0.0.1', () => console.log(`Radius: http://localhost:${server.address().port}`));
}

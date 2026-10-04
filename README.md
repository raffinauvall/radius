# Radius demo

Demo storefront, dashboard member, dan dashboard admin untuk Radius Society. Server Node membaca akun dari `data/accounts.json` dan operasional dari `data/operations.json`. Checkout dan membership tidak memproses transaksi.

## Jalankan lokal

```bash
npm ci
npm run setup
npm start
```

Buka `http://localhost:4176`. Node.js, tanpa Python. Dependency QR dan scanner diinstall lewat `npm ci`. Untuk port lain: `node server.js 4177`. Setup membuat akun dan data contoh hanya jika file belum ada; tidak menimpa data lokal. JSON akun, operasional runtime, foto upload dan file environment diabaikan Git.

## Akun presentasi

- Email: `peter@gmail.com`
- Nama: Andreas Peterang
- Password: `123`

Akun admin:

- Email: `admin@radius.id`
- Password: `admin123`
- Sign in menggunakan form yang sama; role admin membuka `admin.html` otomatis.

Login mencocokkan email dan hash password dari `data/accounts.json`. Password menggunakan scrypt dengan salt, bukan plaintext. File akun dan fixture dashboard tidak berada di folder public. Sesi menggunakan cookie HttpOnly/SameSite=Strict selama 8 jam, disimpan di memory server dan hilang saat server restart. Sign out membatalkan sesi di server; localStorage bukan bukti login.

Sign up menulis akun baru ke JSON secara atomik. Akun baru mendapat Radius Community gratis dan riwayat kosong, tidak memakai tiket/order akun presentasi. Ini untuk demo lokal: password `123` sengaja pendek sesuai permintaan. Sebelum production perlu database, HTTPS, rate limiting, pemulihan akun, dan penyimpanan sesi yang persisten.

## Account dashboard

Masuk melalui `signin.html`, lalu buka `account.html`. Menu akun memiliki view terpisah lewat hash: `#overview`, `#tickets`, `#orders`, `#membership`, dan `#profile`. Dashboard memiliki sidebar sendiri, tanpa top bar dan footer landing page.

Detail tiket/order berasal dari `data/operations.json` melalui endpoint akun yang memerlukan login, difilter berdasarkan customer ID. Record awal adalah data contoh untuk presentasi. Tiket dan order yang dibuat admin muncul di akun member; detail order menyertakan alamat dan resi. Profile dan pengaturan perpanjangan demo masih disimpan di localStorage per email, bukan disinkronkan ke admin. Tidak ada pembayaran atau pembatalan subscription sungguhan. Tiket valid menampilkan QR sungguhan, bisa didownload sebagai PNG dan dicetak.

### Arah UI akun

Dashboard untuk peserta Radius, fokus pada membuka tiket event berikutnya. ENERGY 2 / RHYTHM 2 / MOTION 1.

- Magenta date stub dan kertas hangat mengikuti identitas Radius; tanggal mudah ditemukan seperti pada tiket event.
- Tiket terdekat menjadi fokus utama, membership dan pesanan terakhir menjadi informasi sekunder. Tidak ada grafik atau kartu KPI dekoratif.
- Space Grotesk mempertahankan tipografi landing Radius, dengan ukuran dan jarak lebih ringkas untuk informasi akun.
- Sidebar memisahkan urusan akun dari belanja; mobile menggunakan menu berlabel dengan halaman yang sama.
- Border memisahkan data; shadow hanya pada dialog yang mengambang. Badge menyatakan status, bukan promosi.

### Cek dashboard

Saat server lokal berjalan dan browser berada di origin project, jalankan `checks/account-dashboard.playwright.js` melalui Playwright MCP `browser_run_code_unsafe` dengan parameter `filename`. Check memakai browser context terpisah sehingga tidak mengubah sesi pengguna.

Check mencakup login/logout, filter tiket, dialog, aksi print, pembaruan profile, perpanjangan membership, empty/error/retry, dan kelima halaman pada lebar 320, 390, 768, 960, 1280, dan 1440 px. Catatan evaluasi UI ada di `checks/dashboard-review.md`.

`npm test` mengecek autentikasi, signup, dan seluruh endpoint admin pada server terisolasi dengan salinan JSON sementara. Termasuk penolakan akses member, password reset, nonaktif user, validasi upload, kuota tiket pada request bersamaan, harga transaksi historis, dan persistence setelah restart. Data presentasi tidak diubah oleh test.

## Admin dashboard

Admin memiliki sidebar sendiri, tanpa top bar landing page. Anti Slop mengarahkan UI ke daftar kerja dan form pengelolaan, bukan grafik dekoratif. ENERGY 2 / RHYTHM 2 / MOTION 1: magenta Radius dipakai untuk aksi utama, daftar berbaris memudahkan scan data, tidak ada animasi otomatis. Space Grotesk mengikuti website; kertas hangat dan hitam menjaga keterbacaan.

- Merchandise: tambah/edit produk, harga, collection, deskripsi, stok manual, foto, tampil/sembunyikan, arsip dan pulihkan.
- Events: jadwal, kota, venue, format/jarak, deskripsi, poster, jenis tiket, harga, kuota, visibilitas, arsip dan daftar peserta.
- Tickets: penerbitan untuk user, pencarian/filter event dan status, scan QR lewat kamera/gambar, input kode tiket, check-in manual, pembatalan tiket belum dipakai. Tiket yang sudah check-in tidak bisa diaktifkan ulang. Kuota diperiksa server; riwayat dipertahankan.
- Orders: buat/edit item, jumlah, total dari server, status, alamat, catatan internal, resi. Harga item lama tetap memakai snapshot saat order dibuat.
- Users: akun baru, nama/email, role, status akses, reset password, paket membership dan tanggal perpanjangan. Admin tidak bisa menonaktifkan atau menurunkan role akun yang sedang dipakai.
- Setiap daftar memiliki pencarian, filter, pagination, dan export CSV sesuai hasil filter. Ringkasan menghitung data yang tersimpan, tanpa tren atau proyeksi buatan.

Upload menerima JPG, PNG, dan WebP maksimal 5 MB dengan preview; backend memeriksa MIME dan signature file. File disimpan di `dist/uploads/`, nama UUID, hanya admin yang dapat upload. Menghapus gambar dari record melepas referensi, tidak menghapus file fisik. Foto merchandise dan poster event tampil pada katalog publik.

Arsip menyembunyikan produk/event tanpa menghapus histori. User dinonaktifkan, tiket belum dipakai/order dibatalkan lewat status. Tidak ada hard delete. Perubahan JSON diantrikan dan file diganti atomik untuk satu proses server lokal. Stok tidak berubah otomatis saat order diproses. Status Paid/Cancelled hanya catatan; tidak memproses pembayaran/refund.

### Check-in barcode QR

Member: My Tickets > Buka tiket > Download tiket (PNG). Admin: Tiket & check-in > Scan barcode > pilih event > Mulai kamera. Browser meminta izin kamera; [getUserMedia memerlukan HTTPS atau localhost](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia). Alternatifnya pilih file QR atau masukkan kode tiket, termasuk scanner USB yang mengetik kode.

QR berisi token acak 256-bit, bukan email/nama. Endpoint QR hanya dapat diakses pemilik tiket valid. Scanner dan generator disajikan dari server sendiri, tanpa CDN. Scan memvalidasi event, status tiket dan akun peserta, kemudian menyimpan `ATTENDED`, `entryConsumed`, `checkedInAt` dan `checkedInBy` dalam satu commit JSON. Scan ulang ditolak, termasuk request bersamaan dan setelah restart. Gambar yang sudah didownload tidak hilang, tetapi tidak bisa menghasilkan check-in kedua. Tiket historis Attended juga dikunci.

Jaminan concurrency JSON berlaku untuk satu proses Node. Untuk multi-instance wajib memakai update bersyarat/transaksi database, bukan berbagi file JSON. Kamera fisik belum diuji; tes browser membaca PNG asli dan stream video simulasi. Jalankan `checks/ticket-qr.playwright.js` pada fixture port 4177. Catatan gate UI dan hasil tes ada di `checks/ticket-qr-review.md`.

### Tes UI admin terisolasi

Jangan jalankan write-test pada data presentasi. Buat server fixture terpisah:

```bash
task_radius_fixture=$(mktemp -d /tmp/radius-admin-browser-XXXXXX)
cp data/accounts.json "$task_radius_fixture/accounts.json"
RADIUS_ACCOUNT_FILE="$task_radius_fixture/accounts.json" RADIUS_UPLOAD_DIR="$task_radius_fixture/uploads" node server.js 4177
```

Buka origin port 4177 di Playwright MCP, lalu jalankan `checks/admin.playwright.js` lewat `browser_run_code_unsafe` dengan parameter `filename`. Check membuat record pada fixture, memakai context terpisah, dan menolak origin selain port 4177. Evaluasi antislop dan daftar click-through ada di `checks/admin-review.md`.

## Struktur data

- `data/accounts.json` menyimpan akun, role, status, paket, dan hash password, tidak disajikan sebagai file public.
- `data/operations.json` menyimpan products, events, tickets, orders dan relasinya. `/api/catalog` menyajikan hanya produk/event yang aktif; `/api/account` hanya histori user yang login; `/api/admin/*` memerlukan role admin.
- `data/operations.seed.json` adalah fixture presentasi public tanpa token check-in; setup menyalinnya ke JSON runtime. Jangan commit file akun atau operasional runtime.
- `dist/data/events.json` dan `products.json` adalah seed lama, bukan sumber runtime. `dist/data/membership.json` menyimpan pilihan paket publik; `data/customer.json` menyediakan template benefit Radius+.
- `dist/uploads/` berisi file gambar public, terpisah dari JSON akun dan operasional.
- `prisma/schema.prisma` adalah kontrak ORM untuk migrasi database berikutnya.
- UI tidak membaca schema Prisma secara langsung. Saat backend dibuat, ganti loader JSON dengan repository Prisma tanpa mengubah bentuk data yang dipakai UI.

## Migrasi berikutnya

1. Install Prisma dan pilih database production.
2. Isi `DATABASE_URL`.
3. Jalankan migration dari schema yang ada.
4. Implementasikan repository untuk `Customer`, `Product`, `Event`, `TicketType`, `Ticket`, `Order`, dan `Membership` dengan transaksi DB menggantikan queue JSON. Check-in harus memakai update bersyarat `status=VALID AND entryConsumed=false` dan menerima tepat satu row; simpan token unik, admin dan waktu check-in sesuai schema.
5. Import ID JSON yang ada, buat slug event, hubungkan jenis tiket melalui pasangan event ID + nama, dan normalisasi item order. Pertahankan harga historis serta membership plan/tanggal perpanjangan. Tambahkan snapshot jadwal tiket jika event historis harus tetap berbeda dari jadwal event terbaru.
6. Pertahankan kontrak endpoint yang sudah dipakai UI. Prisma saat ini kontrak schema, belum dependency atau runtime database.

# Radius demo

Demo storefront, dashboard member, dan dashboard admin untuk Radius Society. Server Node memakai Prisma + PostgreSQL jika `DATABASE_URL` tersedia, atau JSON untuk lokal tanpa database. Checkout dan membership tidak memproses transaksi.

## Jalankan lokal

```bash
npm ci
npm run setup
npm start
```

Buka `http://localhost:4176`. Gunakan Node.js 22, tanpa Python. Dependency QR dan scanner diinstall lewat `npm ci`. Untuk port lain: `node server.js 4177`. Setup membuat akun dan data contoh hanya jika file belum ada; tidak menimpa data lokal. JSON akun, operasional runtime, foto upload dan file environment diabaikan Git.

Jika `.env` berisi koneksi PostgreSQL, jalankan `npm run db:setup` sebelum `npm start`. Server membaca `.env` tanpa mencetak kredensial. `RADIUS_ACCOUNT_FILE` memaksa penggunaan JSON pada fixture pengujian walaupun `.env` berisi koneksi DB.

## Deploy demo ke Vercel

1. Hubungkan repo ini ke project Vercel dengan environment `DATABASE_URL` untuk runtime dan `DATABASE_URL_UNPOOLED` untuk migration. Pilih scope Production; gunakan database terpisah jika Preview juga diaktifkan.
2. Deploy ulang setelah perubahan environment. `vercel.json` memakai runtime Node dan `npm run build`.
3. Build menghasilkan Prisma Client, menjalankan migration yang belum diterapkan, dan membuat akun/data contoh jika belum ada. Build berikutnya mempertahankan data, hash password, token tiket, gambar, dan status check-in.

Build harus bisa mengakses PostgreSQL. Jangan menggunakan file JSON atau folder upload lokal sebagai penyimpanan Vercel. Nilai connection string tetap di environment, tidak di repo. Koneksi pooled dipakai aplikasi; koneksi unpooled dipakai Prisma migration lewat `DIRECT_URL` yang disiapkan oleh build script.

Demo menyimpan struktur akun dan operasional dalam satu row JSONB `DemoState`, sesi dalam `DemoSession`, dan gambar dalam `DemoUpload`. Prisma benar-benar dipakai pada runtime. Bentuk data tetap mengikuti kontrak endpoint saat ini; tabel relasional `Customer`, `Product`, dan lainnya belum menjadi sumber CRUD. Ini batas demo, bukan arsitektur untuk katalog besar.

## Akun presentasi

- Email: `peter@gmail.com`
- Nama: Andreas Peterang
- Password: `123`

Akun admin:

- Email: `admin@radius.id`
- Password: `admin123`
- Sign in menggunakan form yang sama; role admin membuka `admin.html` otomatis.

Login mencocokkan email dan hash password dari storage server. Password menggunakan scrypt dengan salt, bukan plaintext. File akun dan fixture dashboard tidak berada di folder public. Sesi menggunakan cookie HttpOnly/SameSite=Strict selama 8 jam, dengan Secure di Vercel. PostgreSQL menyimpan hash token sesi sehingga login bertahan lintas instance dan restart; mode JSON menyimpan sesi di memory. Sign out membatalkan sesi di server; localStorage bukan bukti login.

Sign up menulis akun baru lewat transaksi DB atau commit JSON atomik. Akun baru mendapat Radius Community gratis dan riwayat kosong, tidak memakai tiket/order akun presentasi. Password reset membatalkan sesi lama. Password `123` dan `admin123` sengaja dipakai untuk presentasi sesuai permintaan; kredensial ini tercantum di repo public. Batasi akses demo. Sebelum menerima pengguna sungguhan, ganti kredensial admin, tambah rate limiting dan pemulihan akun, serta aktifkan pembayaran sungguhan.

## Account dashboard

Masuk melalui `signin.html`, lalu buka `account.html`. Menu akun memiliki view terpisah lewat hash: `#overview`, `#tickets`, `#orders`, `#membership`, dan `#profile`. Dashboard memiliki sidebar sendiri, tanpa top bar dan footer landing page.

Detail tiket/order berasal dari storage server melalui endpoint akun yang memerlukan login, difilter berdasarkan customer ID. Record awal adalah data contoh untuk presentasi. Tiket dan order yang dibuat admin muncul di akun member; detail order menyertakan alamat dan resi. Profile dan pengaturan perpanjangan demo masih disimpan di localStorage per email, bukan disinkronkan ke admin. Tidak ada pembayaran atau pembatalan subscription sungguhan. Tiket valid menampilkan QR sungguhan, bisa didownload sebagai PNG dan dicetak.

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

Upload menerima JPG, PNG, dan WebP maksimal 5 MB dengan preview; backend memeriksa MIME dan signature file. PostgreSQL menyimpan gambar sebagai bytea; mode JSON memakai `dist/uploads/`. Nama UUID, hanya admin yang dapat upload. Menghapus gambar dari record melepas referensi, tidak menghapus gambar tersimpan. Foto merchandise dan poster event tampil pada katalog publik. Untuk katalog besar, pindahkan gambar ke object storage.

Arsip menyembunyikan produk/event tanpa menghapus histori. User dinonaktifkan, tiket belum dipakai/order dibatalkan lewat status. Tidak ada hard delete. PostgreSQL mengunci row operasional selama transaksi; JSON memakai antrean dan penggantian file atomik untuk satu proses lokal. Stok tidak berubah otomatis saat order diproses. Status Paid/Cancelled hanya catatan; tidak memproses pembayaran/refund.

### Check-in barcode QR

Member: My Tickets > Buka tiket > Download tiket (PNG). Admin: Tiket & check-in > Scan barcode > pilih event > Mulai kamera. Browser meminta izin kamera; [getUserMedia memerlukan HTTPS atau localhost](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia). Alternatifnya pilih file QR atau masukkan kode tiket, termasuk scanner USB yang mengetik kode.

QR berisi token acak 256-bit, bukan email/nama. Endpoint QR hanya dapat diakses pemilik tiket valid. Scanner dan generator disajikan dari server sendiri, tanpa CDN. Scan memvalidasi event, status tiket dan akun peserta, kemudian menyimpan `ATTENDED`, `entryConsumed`, `checkedInAt` dan `checkedInBy` dalam satu transaksi DB atau commit JSON. Scan ulang ditolak, termasuk request bersamaan dan setelah restart. Gambar yang sudah didownload tidak hilang, tetapi tidak bisa menghasilkan check-in kedua. Tiket historis Attended juga dikunci.

Transaksi PostgreSQL menggunakan `SELECT ... FOR UPDATE` dan membaca ulang data sebelum validasi, sehingga dua instance tidak bisa menerima tiket yang sama atau melewati kuota. Jaminan concurrency JSON berlaku hanya untuk satu proses Node. Kamera fisik belum diuji; tes browser membaca PNG asli dan stream video simulasi. Jalankan `checks/ticket-qr.playwright.js` pada fixture port 4177. Catatan gate UI dan hasil tes ada di `checks/ticket-qr-review.md`.

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
- `database.js` memilih koneksi DB; `storage.js` mengatur transaksi Prisma, sesi dan gambar, dengan fallback JSON lokal.
- `prisma/schema.prisma` memuat tabel runtime demo dan model relasional untuk normalisasi berikutnya. UI memakai API, tidak membaca schema secara langsung.

## Pengujian PostgreSQL

`checks/postgres.test.js` menguji sesi lintas instance/restart, signup bersamaan, gambar persisten, order, kuota dan penolakan scan ulang. Test membuat schema sementara dan menghapus hanya schema tersebut setelah selesai. Untuk menjalankannya bersama tes JSON:

```bash
RADIUS_TEST_DATABASE_URL=postgresql://radius_test@127.0.0.1:54329/radius_test npm test
```

Siapkan PostgreSQL lokal terisolasi pada port tersebut. Guard menolak host remote dan nama database tanpa `radius_test`. Jangan gunakan DB presentasi. Tanpa environment test, `npm test` menjalankan tes JSON dan melewati tes DB. Hasil regresi dan delivery gate perubahan ini ada di `checks/postgres-review.md`.

## Normalisasi berikutnya

1. Ganti row JSONB dengan CRUD pada `Customer`, `Product`, `Event`, `TicketType`, `Ticket`, `Order`, dan `Membership` tanpa mengubah kontrak endpoint UI.
2. Import ID yang ada, buat slug event, hubungkan jenis tiket melalui pasangan event ID + nama, dan normalisasi item order. Pertahankan harga historis, token/status check-in serta paket/tanggal membership. Tambahkan snapshot jadwal jika histori harus tetap berbeda dari jadwal event terbaru.
3. Ganti kunci row global dengan update tiket bersyarat `status=VALID AND entryConsumed=false` yang menerima tepat satu row; transaksi kuota tetap harus aman lintas instance.

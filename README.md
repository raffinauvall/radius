# Radius demo

Demo storefront, dashboard member, dan dashboard admin untuk Radius Society. Server Node memakai Prisma + PostgreSQL untuk seluruh data aplikasi, tanpa file data JSON atau fallback lokal. Checkout dan membership tidak memproses pembayaran sungguhan.

## Jalankan lokal

```bash
npm ci
npm run setup
npm start
```

Buka `http://localhost:4176`. Gunakan Node.js 22, tanpa Python. Isi `.env` dari `.env.example` dengan koneksi PostgreSQL sebelum setup. Untuk port lain: `node server.js 4177`. Setup menjalankan migration dan seed; tidak menimpa akun atau data operasional yang sudah ada. Server/build memberi error jika koneksi DB belum diisi. Jangan commit nilai environment.

`npm run setup`, `npm run db:setup`, dan `npm run build` menjalankan persiapan DB yang sama. Server membaca `.env` tanpa mencetak kredensial. `RADIUS_ACCOUNT_FILE` dan `RADIUS_UPLOAD_DIR` sudah tidak dipakai; tidak ada jalur autentikasi, sesi atau upload lewat file.

## Deploy demo ke Vercel

1. Hubungkan repo ini ke project Vercel dengan environment `DATABASE_URL` untuk runtime dan `DATABASE_URL_UNPOOLED` untuk migration. Pilih scope Production; gunakan database terpisah jika Preview juga diaktifkan.
2. Deploy ulang setelah perubahan environment. Vercel mendeteksi `server.ts` di root sebagai entrypoint Node dan menjalankan `npm run build` sebelum deploy.
3. Build menghasilkan Prisma Client, menjalankan migration yang belum diterapkan, dan membuat akun/data contoh jika belum ada. Build berikutnya mempertahankan data, hash password, token tiket, gambar, dan status check-in.

Build harus bisa mengakses PostgreSQL. Jangan menggunakan file JSON atau folder upload lokal sebagai penyimpanan Vercel. Nilai connection string tetap di environment, tidak di repo. Koneksi pooled dipakai aplikasi; koneksi unpooled dipakai Prisma migration lewat `DIRECT_URL` yang disiapkan oleh build script.

Demo menyimpan akun, operasional, paket dan benefit membership dalam satu row PostgreSQL JSONB `DemoState`, sesi dalam `DemoSession`, dan gambar dalam `DemoUpload`. JSONB adalah kolom database, bukan file JSON. Prisma benar-benar dipakai pada runtime. Bentuk data tetap mengikuti kontrak endpoint saat ini; tabel relasional `Customer`, `Product`, dan lainnya belum menjadi sumber CRUD. Ini batas demo, bukan arsitektur untuk katalog besar.

## Akun presentasi

- Email: `peter@gmail.com`
- Nama: Andreas Peterang
- Password: `123`

Akun admin:

- Email: `admin@radius.id`
- Password: `admin123`
- Sign in menggunakan form yang sama; role admin membuka `admin.html` otomatis.

Login mencocokkan email dan hash password dari DB. Password menggunakan scrypt dengan salt, bukan plaintext. Sesi menggunakan cookie HttpOnly/SameSite=Strict selama 8 jam, dengan Secure di Vercel. PostgreSQL menyimpan hash token sesi sehingga login bertahan lintas instance dan restart. Sign out membatalkan sesi di DB; localStorage bukan bukti login.

Sign up menulis akun baru lewat transaksi DB. Akun baru mendapat Radius Community gratis dan riwayat kosong, tidak memakai tiket/order akun presentasi. Password reset membatalkan sesi lama. Password `123` dan `admin123` sengaja dipakai untuk presentasi sesuai permintaan; kredensial ini tercantum di repo public. Batasi akses demo. Sebelum menerima pengguna sungguhan, ganti kredensial admin, tambah rate limiting dan pemulihan akun, serta aktifkan pembayaran sungguhan.

## Account dashboard

Masuk melalui `signin.html`, lalu buka `account.html`. Menu akun memiliki view terpisah lewat hash: `#overview`, `#tickets`, `#orders`, `#membership`, dan `#profile`. Dashboard memiliki sidebar sendiri, tanpa top bar dan footer landing page.

Detail tiket/order berasal dari DB melalui endpoint akun yang memerlukan login, difilter berdasarkan customer ID. Record awal adalah data contoh untuk presentasi. Tiket dan order yang dibuat admin muncul di akun member; detail order menyertakan alamat dan resi. Nama/WhatsApp dan pilihan perpanjangan tersimpan melalui `PATCH /api/account/profile` dan `PATCH /api/account/membership`; perubahan bertahan lintas perangkat dan terlihat di data admin. Harga, paket dan benefit juga berasal dari DB. Tidak ada pembayaran atau pembatalan subscription sungguhan. Tiket valid menampilkan QR sungguhan, bisa didownload sebagai PNG dan dicetak.

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

Tes memakai schema PostgreSQL sementara pada database lokal terisolasi. Termasuk autentikasi, signup, penolakan akses member, password reset, nonaktif user, upload, kuota tiket pada request bersamaan, harga historis, profile, perpanjangan dan persistence setelah restart. Data presentasi tidak diubah oleh test; isi `RADIUS_TEST_DATABASE_URL` seperti pada bagian pengujian.

## Admin dashboard

Admin memiliki sidebar sendiri, tanpa top bar landing page. Anti Slop mengarahkan UI ke daftar kerja dan form pengelolaan, bukan grafik dekoratif. ENERGY 2 / RHYTHM 2 / MOTION 1: magenta Radius dipakai untuk aksi utama, daftar berbaris memudahkan scan data, tidak ada animasi otomatis. Space Grotesk mengikuti website; kertas hangat dan hitam menjaga keterbacaan.

- Merchandise: tambah/edit produk, harga, collection, deskripsi, stok manual, foto, tampil/sembunyikan, arsip dan pulihkan.
- Events: jadwal, kota, venue, format/jarak, deskripsi, poster, jenis tiket, harga, kuota, visibilitas, arsip dan daftar peserta.
- Tickets: penerbitan untuk user, pencarian/filter event dan status, scan QR lewat kamera/gambar, input kode tiket, check-in manual, pembatalan tiket belum dipakai. Tiket yang sudah check-in tidak bisa diaktifkan ulang. Kuota diperiksa server; riwayat dipertahankan.
- Orders: buat/edit item, jumlah, total dari server, status, alamat, catatan internal, resi. Harga item lama tetap memakai snapshot saat order dibuat.
- Users: akun baru, nama/email, role, status akses, reset password, paket membership dan tanggal perpanjangan. Admin tidak bisa menonaktifkan atau menurunkan role akun yang sedang dipakai.
- Setiap daftar memiliki pencarian, filter, pagination, dan export CSV sesuai hasil filter. Ringkasan menghitung data yang tersimpan, tanpa tren atau proyeksi buatan.

Upload menerima JPG, PNG, dan WebP maksimal 5 MB dengan preview; backend memeriksa MIME dan signature file. PostgreSQL menyimpan gambar sebagai bytea. Nama UUID, hanya admin yang dapat upload. Menghapus gambar dari record melepas referensi, tidak menghapus gambar tersimpan. Foto merchandise dan poster event tampil pada katalog publik. Untuk katalog besar, pindahkan gambar ke object storage.

Arsip menyembunyikan produk/event tanpa menghapus histori. User dinonaktifkan, tiket belum dipakai/order dibatalkan lewat status. Tidak ada hard delete. PostgreSQL mengunci row operasional selama transaksi. Stok tidak berubah otomatis saat order diproses. Status Paid/Cancelled hanya catatan; tidak memproses pembayaran/refund.

### Check-in barcode QR

Member: My Tickets > Buka tiket > Download tiket (PNG). Admin: Tiket & check-in > Scan barcode > pilih event > Mulai kamera. Browser meminta izin kamera; [getUserMedia memerlukan HTTPS atau localhost](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia). Alternatifnya pilih file QR atau masukkan kode tiket, termasuk scanner USB yang mengetik kode.

QR berisi token acak 256-bit, bukan email/nama. Endpoint QR hanya dapat diakses pemilik tiket valid. Scanner dan generator disajikan dari server sendiri, tanpa CDN. Scan memvalidasi event, status tiket dan akun peserta, kemudian menyimpan `ATTENDED`, `entryConsumed`, `checkedInAt` dan `checkedInBy` dalam satu transaksi DB. Scan ulang ditolak, termasuk request bersamaan dan setelah restart. Gambar yang sudah didownload tidak hilang, tetapi tidak bisa menghasilkan check-in kedua. Tiket historis Attended juga dikunci.

Transaksi PostgreSQL menggunakan `SELECT ... FOR UPDATE` dan membaca ulang data sebelum validasi, sehingga dua instance tidak bisa menerima tiket yang sama atau melewati kuota. Kamera fisik belum diuji; tes browser membaca PNG asli dan stream video simulasi. Jalankan `checks/ticket-qr.playwright.js` pada fixture port 4177. Catatan tes awal ada di `checks/ticket-qr-review.md`; hasil DB-only ada di `checks/db-only-review.md`.

### Tes UI admin terisolasi

Jangan jalankan write-test pada data presentasi. Buat server fixture terpisah:

```bash
RADIUS_TEST_DATABASE_URL=postgresql://radius_test@127.0.0.1:54329/radius_test node --input-type=module -e 'import { databaseFixture } from "./checks/database-fixture.js"; const fixture = await databaseFixture(); console.log(await fixture.start(4177).then(server => server.base)); process.on("SIGINT", async () => { await fixture.dispose(); process.exit(); }); process.stdin.resume();'
```

Buka origin port 4177 di Playwright MCP, lalu jalankan `checks/admin.playwright.js` lewat `browser_run_code_unsafe` dengan parameter `filename`. Check membuat record pada fixture, memakai context terpisah, dan menolak origin selain port 4177. Evaluasi antislop dan daftar click-through ada di `checks/admin-review.md`.

## Struktur data

- `DemoState` menyimpan akun, products, events, tickets, orders, paket dan benefit membership. `/api/catalog` hanya menyajikan katalog aktif; `/api/account` hanya histori user yang login; `/api/admin/*` memerlukan admin.
- `DemoSession` menyimpan sesi login; `DemoUpload` menyimpan bytes gambar. Tidak ada penyimpanan file untuk data user atau upload.
- `demo-data.js`, `membership-seed.js` dan `demo-seed.js` hanya mengisi DB awal atau fixture test. Server tidak membaca seed untuk menyajikan request. Seed berikutnya tidak menimpa data yang ada; upgrade membership menambah konfigurasi jika belum tersedia.
- `database.js` memilih koneksi DB; `storage.js` mengatur transaksi Prisma, sesi dan gambar. JSON tetap dipakai sebagai format request/response HTTP, bukan penyimpanan file.
- `prisma/schema.prisma` memuat tabel runtime demo dan model relasional untuk normalisasi berikutnya. UI memakai API, tidak membaca schema secara langsung.

## Pengujian PostgreSQL

Ketiga suite test memakai PostgreSQL: autentikasi, admin, dan lintas instance. Test membuat schema sementara dan menghapus hanya schema tersebut setelah selesai:

```bash
RADIUS_TEST_DATABASE_URL=postgresql://radius_test@127.0.0.1:54329/radius_test npm test
```

Siapkan PostgreSQL lokal terisolasi pada port tersebut. Guard menolak host remote dan database selain `radius_test`. Jangan gunakan DB presentasi. Tanpa environment test, runner melewati tes DB; itu bukan verifikasi yang lulus. Hasil regresi dan delivery gate perubahan ini ada di `checks/db-only-review.md`. Review lama mencatat tahap implementasi sebelumnya.

## Normalisasi berikutnya

1. Ganti row JSONB dengan CRUD pada `Customer`, `Product`, `Event`, `TicketType`, `Ticket`, `Order`, dan `Membership` tanpa mengubah kontrak endpoint UI.
2. Import ID yang ada, buat slug event, hubungkan jenis tiket melalui pasangan event ID + nama, dan normalisasi item order. Pertahankan harga historis, token/status check-in serta paket/tanggal membership. Tambahkan snapshot jadwal jika histori harus tetap berbeda dari jadwal event terbaru.
3. Ganti kunci row global dengan update tiket bersyarat `status=VALID AND entryConsumed=false` yang menerima tepat satu row; transaksi kuota tetap harus aman lintas instance.

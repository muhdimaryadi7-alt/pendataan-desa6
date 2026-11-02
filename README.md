# Pendataan Warga RW 01

Web app pendataan 1 RW dengan 2 RT: **data penduduk, kas, iuran, dan kalender rapat**, plus halaman laporan publik yang bisa dibuka warga tanpa login.

Dibangun dengan Next.js 16 (App Router), Supabase (Postgres + Auth + Storage), dan Tailwind CSS. Siap di-deploy ke Vercel.

## Fitur

| Modul | Isi |
| --- | --- |
| Penduduk | Kartu Keluarga & anggota, status hunian (tetap / kontrak / kos), mutasi lahir / meninggal / pindah, pencarian |
| Kas | Bendahara mengajukan transaksi + foto nota, Ketua menyetujui / menolak, koreksi lewat transaksi pembalik |
| Iuran | Tagihan bulanan otomatis untuk KK tetap (kontrak/kos tidak ditagih), centang bayar saat rapat, dibukukan ke kas |
| Kas RW | Terpisah; setoran RT → RW otomatis tercatat di kedua sisi |
| Rapat | Jadwal berulang (mis. Minggu pertama tiap bulan), notulen & keputusan, bagikan ke WhatsApp, file kalender .ics |
| Publik | `/` — saldo, transaksi + bukti, rekap iuran, statistik penduduk, jadwal & notulen rapat. Tanpa data pribadi |
| Audit | Semua perubahan tercatat (siapa, kapan, data lama → baru) |

**Peran:** Super Admin, Ketua RW, Bendahara RW, Ketua RT, Sekretaris RT, Bendahara RT. Hak akses ditegakkan di database (Row Level Security), bukan hanya di tampilan.

## Menjalankan

### 1. Buat project Supabase

1. Buka [supabase.com](https://supabase.com) → **New project** (region: Southeast Asia / Singapore).
2. **SQL Editor** → jalankan berurutan: [`supabase/schema.sql`](supabase/schema.sql), lalu [`supabase/02-pengguna.sql`](supabase/02-pengguna.sql).
3. **Project Settings → API Keys**: salin Project URL dan publishable key. Secret key **tidak** diperlukan.

### 2. Atur environment

```bash
cp .env.example .env.local
```

Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

### 3. Buat Super Admin pertama

1. Ganti email di [`supabase/super-admin-otomatis.sql`](supabase/super-admin-otomatis.sql) lalu jalankan di SQL Editor.
2. **Authentication → Users → Add user** dengan email tersebut (centang *Auto confirm user*). Akun itu otomatis menjadi Super Admin.

### Menambah pengurus

Buat akunnya di **Authentication → Users → Add user**, lalu di aplikasi buka menu **Pengguna** → isi nama, peran, dan RT → **Tetapkan**.

### 4. Jalankan lokal

```bash
npm install
npm run dev
```

Buka http://localhost:3000 (laporan publik) dan http://localhost:3000/login (pengurus).

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di [vercel.com/new](https://vercel.com/new) → import repo → tambahkan 2 environment variable yang sama dengan `.env.local` (tanpa `DATABASE_URL`).
3. Deploy. Bagikan alamat Vercel (atau QR code-nya) ke grup WhatsApp warga.

Atau tanpa GitHub, langsung dari folder ini: `npx vercel deploy --prod`.

Versi yang berjalan: https://pendataan-rw01.vercel.app

## Alur penting

- **Kas:** Bendahara mengajukan → Ketua menyetujui → baru tampil di laporan publik. Transaksi yang sudah disetujui terkunci; kesalahan diperbaiki dengan *Koreksi*.
- **Iuran:** Ketua RT mengatur nominal → Bendahara klik *Buat tagihan* tiap bulan → saat rapat centang *Tunai/Transfer* → *Bukukan ke kas* → Ketua menyetujui.
- **Setoran RW:** Bendahara RT mencatat pengeluaran kategori *Setoran RW* → setelah disetujui Ketua RT, otomatis muncul sebagai pemasukan kas RW untuk dikonfirmasi Ketua RW.

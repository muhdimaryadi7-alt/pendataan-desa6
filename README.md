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
2. **SQL Editor** → tempel isi [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   (Atau isi `DATABASE_URL` di `.env.local` lalu jalankan `npm run db:migrate`.)
3. **Project Settings → API Keys**: salin Project URL, publishable key, dan secret key.

### 2. Atur environment

```bash
cp .env.example .env.local
```

Isi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, dan `SUPABASE_SECRET_KEY`.

### 3. Buat Super Admin pertama

```bash
npm run buat-admin -- email@anda.com "PasswordKuat123" "Nama Anda"
```

Setelah itu, akun pengurus lain dibuat dari menu **Pengguna** di aplikasi.

### 4. Jalankan lokal

```bash
npm install
npm run dev
```

Buka http://localhost:3000 (laporan publik) dan http://localhost:3000/login (pengurus).

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di [vercel.com/new](https://vercel.com/new) → import repo → tambahkan 3 environment variable yang sama dengan `.env.local` (tanpa `DATABASE_URL`).
3. Deploy. Bagikan alamat Vercel (atau QR code-nya) ke grup WhatsApp warga.

## Alur penting

- **Kas:** Bendahara mengajukan → Ketua menyetujui → baru tampil di laporan publik. Transaksi yang sudah disetujui terkunci; kesalahan diperbaiki dengan *Koreksi*.
- **Iuran:** Ketua RT mengatur nominal → Bendahara klik *Buat tagihan* tiap bulan → saat rapat centang *Tunai/Transfer* → *Bukukan ke kas* → Ketua menyetujui.
- **Setoran RW:** Bendahara RT mencatat pengeluaran kategori *Setoran RW* → setelah disetujui Ketua RT, otomatis muncul sebagai pemasukan kas RW untuk dikonfirmasi Ketua RW.

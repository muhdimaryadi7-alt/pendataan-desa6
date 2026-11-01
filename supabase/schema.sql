-- =====================================================================
-- Sistem Pendataan Desa (1 RW, 2 RT) — skema database Supabase
-- Jalankan sekali di Supabase SQL Editor, atau: npm run db:migrate
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Wilayah & pengguna
-- ---------------------------------------------------------------------
create type public.peran as enum (
  'super_admin', 'ketua_rw', 'bendahara_rw',
  'ketua_rt', 'sekretaris_rt', 'bendahara_rt'
);

create table public.wilayah (
  id smallint primary key,
  tipe text not null check (tipe in ('rw', 'rt')),
  nama text not null,
  parent_id smallint references public.wilayah(id)
);
insert into public.wilayah (id, tipe, nama, parent_id) values
  (1, 'rw', 'RW 01', null),
  (2, 'rt', 'RT 01', 1),
  (3, 'rt', 'RT 02', 1);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  peran public.peran not null,
  wilayah_id smallint not null references public.wilayah(id),
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Saldo awal & nominal iuran per wilayah (RT 01, RT 02, RW 01)
create table public.pengaturan_wilayah (
  wilayah_id smallint primary key references public.wilayah(id),
  saldo_awal numeric(14,0) not null default 0,
  iuran_bulanan numeric(14,0) not null default 0
);
insert into public.pengaturan_wilayah (wilayah_id) values (1), (2), (3);

-- ---------------------------------------------------------------------
-- Fungsi bantu hak akses
-- ---------------------------------------------------------------------
create or replace function public.my_peran() returns public.peran
language sql stable security definer set search_path = public as $$
  select peran from profiles where id = auth.uid() and aktif
$$;

create or replace function public.my_wilayah() returns smallint
language sql stable security definer set search_path = public as $$
  select wilayah_id from profiles where id = auth.uid() and aktif
$$;

-- Pengurus tingkat RW boleh melihat seluruh RT
create or replace function public.is_rw() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_peran() in ('super_admin', 'ketua_rw', 'bendahara_rw'), false)
$$;

create or replace function public.bisa_lihat(w smallint) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (public.is_rw() or w = public.my_wilayah())
$$;

-- Boleh menulis di wilayah w bila perannya termasuk p (super_admin selalu boleh)
create or replace function public.punya_peran(w smallint, variadic p public.peran[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    public.my_peran() = 'super_admin'
    or (public.my_wilayah() = w and public.my_peran() = any(p)),
    false)
$$;

-- ---------------------------------------------------------------------
-- Data penduduk
-- ---------------------------------------------------------------------
create table public.kartu_keluarga (
  id uuid primary key default gen_random_uuid(),
  no_kk text not null unique,
  alamat text not null,
  wilayah_id smallint not null references public.wilayah(id),
  status_hunian text not null default 'tetap' check (status_hunian in ('tetap', 'kontrak', 'kos')),
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.penduduk (
  id uuid primary key default gen_random_uuid(),
  kk_id uuid not null references public.kartu_keluarga(id) on delete cascade,
  wilayah_id smallint not null references public.wilayah(id),
  nik text not null unique,
  nama text not null,
  tempat_lahir text,
  tgl_lahir date,
  jk text not null check (jk in ('L', 'P')),
  agama text,
  status_kawin text,
  hubungan text not null default 'Anggota',
  pendidikan text,
  pekerjaan text,
  no_hp text,
  status text not null default 'aktif' check (status in ('aktif', 'pindah', 'meninggal')),
  created_at timestamptz not null default now()
);

create table public.mutasi_penduduk (
  id uuid primary key default gen_random_uuid(),
  penduduk_id uuid not null references public.penduduk(id) on delete cascade,
  wilayah_id smallint not null references public.wilayah(id),
  jenis text not null check (jenis in ('lahir', 'meninggal', 'masuk', 'keluar')),
  tanggal date not null default current_date,
  keterangan text,
  dibuat_oleh uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- Wilayah penduduk selalu mengikuti KK-nya
create or replace function public.tg_penduduk_wilayah() returns trigger
language plpgsql as $$
begin
  select wilayah_id into new.wilayah_id from public.kartu_keluarga where id = new.kk_id;
  return new;
end $$;
create trigger penduduk_wilayah before insert or update of kk_id on public.penduduk
  for each row execute function public.tg_penduduk_wilayah();

-- ---------------------------------------------------------------------
-- Kas
-- ---------------------------------------------------------------------
create table public.transaksi_kas (
  id uuid primary key default gen_random_uuid(),
  wilayah_id smallint not null references public.wilayah(id),
  tanggal date not null default current_date,
  tipe text not null check (tipe in ('masuk', 'keluar')),
  kategori text not null,
  nominal numeric(14,0) not null check (nominal > 0),
  keterangan text,
  bukti_path text,
  status text not null default 'diajukan' check (status in ('diajukan', 'disetujui', 'ditolak')),
  alasan_tolak text,
  reversal_of uuid references public.transaksi_kas(id),
  setoran_dari uuid references public.transaksi_kas(id),
  dibuat_oleh uuid default auth.uid() references public.profiles(id),
  disetujui_oleh uuid references public.profiles(id),
  disetujui_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.transaksi_kas (wilayah_id, tanggal desc);

-- Transaksi yang sudah disetujui terkunci: koreksi lewat transaksi pembalik
create or replace function public.tg_kunci_transaksi() returns trigger
language plpgsql as $$
begin
  if old.status = 'disetujui' then
    raise exception 'Transaksi yang sudah disetujui tidak bisa diubah atau dihapus. Gunakan koreksi.';
  end if;
  return coalesce(new, old);
end $$;
create trigger kunci_transaksi before update or delete on public.transaksi_kas
  for each row execute function public.tg_kunci_transaksi();

-- Ketua RT/RW menyetujui atau menolak
create or replace function public.setujui_transaksi(p_id uuid, p_setuju boolean, p_alasan text default null)
returns void language plpgsql security definer set search_path = public as $$
declare t transaksi_kas;
begin
  select * into t from transaksi_kas where id = p_id;
  if t.id is null then raise exception 'Transaksi tidak ditemukan'; end if;
  if not punya_peran(t.wilayah_id, 'ketua_rt', 'ketua_rw') then
    raise exception 'Hanya ketua yang dapat menyetujui transaksi';
  end if;
  if t.status <> 'diajukan' then raise exception 'Transaksi tidak berstatus diajukan'; end if;

  if p_setuju then
    update transaksi_kas set status = 'disetujui', disetujui_oleh = auth.uid(), disetujui_at = now(), alasan_tolak = null
      where id = p_id;
    -- Setoran RT ke RW otomatis tercatat sebagai pemasukan kas RW (menunggu konfirmasi RW)
    if t.kategori = 'Setoran RW' and t.tipe = 'keluar'
       and (select tipe from wilayah where id = t.wilayah_id) = 'rt' then
      insert into transaksi_kas (wilayah_id, tanggal, tipe, kategori, nominal, keterangan, bukti_path, setoran_dari, dibuat_oleh)
      values ((select parent_id from wilayah where id = t.wilayah_id), t.tanggal, 'masuk', 'Setoran RT', t.nominal,
              'Setoran dari ' || (select nama from wilayah where id = t.wilayah_id), t.bukti_path, t.id, auth.uid());
    end if;
  else
    update transaksi_kas set status = 'ditolak', alasan_tolak = p_alasan where id = p_id;
  end if;
end $$;

-- Koreksi = transaksi pembalik (arah berlawanan), tetap perlu persetujuan
create or replace function public.koreksi_transaksi(p_id uuid, p_alasan text)
returns uuid language plpgsql security definer set search_path = public as $$
declare t transaksi_kas; baru uuid;
begin
  select * into t from transaksi_kas where id = p_id;
  if t.status <> 'disetujui' then raise exception 'Hanya transaksi disetujui yang dikoreksi'; end if;
  if not punya_peran(t.wilayah_id, 'bendahara_rt', 'bendahara_rw') then
    raise exception 'Hanya bendahara yang dapat membuat koreksi';
  end if;
  insert into transaksi_kas (wilayah_id, tipe, kategori, nominal, keterangan, reversal_of)
  values (t.wilayah_id, case when t.tipe = 'masuk' then 'keluar' else 'masuk' end, 'Koreksi', t.nominal,
          'Koreksi: ' || coalesce(p_alasan, '-'), t.id)
  returning id into baru;
  return baru;
end $$;

-- ---------------------------------------------------------------------
-- Iuran (khusus KK berstatus tetap; kontrak/kos tidak ditagih)
-- ---------------------------------------------------------------------
create table public.tagihan_iuran (
  id uuid primary key default gen_random_uuid(),
  kk_id uuid not null references public.kartu_keluarga(id) on delete cascade,
  wilayah_id smallint not null references public.wilayah(id),
  periode date not null,
  nominal numeric(14,0) not null,
  terbayar numeric(14,0) not null default 0,
  created_at timestamptz not null default now(),
  unique (kk_id, periode)
);

create table public.pembayaran_iuran (
  id uuid primary key default gen_random_uuid(),
  tagihan_id uuid not null references public.tagihan_iuran(id) on delete cascade,
  wilayah_id smallint not null references public.wilayah(id),
  tanggal date not null default current_date,
  nominal numeric(14,0) not null check (nominal > 0),
  metode text not null default 'tunai' check (metode in ('tunai', 'transfer')),
  transaksi_id uuid references public.transaksi_kas(id),
  dibuat_oleh uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create or replace function public.buat_tagihan(p_wilayah smallint, p_periode date)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer; nom numeric;
begin
  if not punya_peran(p_wilayah, 'bendahara_rt', 'ketua_rt') then raise exception 'Tidak berhak'; end if;
  select iuran_bulanan into nom from pengaturan_wilayah where wilayah_id = p_wilayah;
  if coalesce(nom, 0) <= 0 then raise exception 'Atur nominal iuran bulanan terlebih dahulu'; end if;
  insert into tagihan_iuran (kk_id, wilayah_id, periode, nominal)
  select id, wilayah_id, date_trunc('month', p_periode)::date, nom
    from kartu_keluarga
   where wilayah_id = p_wilayah and aktif and status_hunian = 'tetap'
  on conflict (kk_id, periode) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- Catat pembayaran (default: melunasi sisa tagihan)
create or replace function public.bayar_iuran(p_tagihan uuid, p_metode text default 'tunai', p_nominal numeric default null)
returns void language plpgsql security definer set search_path = public as $$
declare t tagihan_iuran; jml numeric;
begin
  select * into t from tagihan_iuran where id = p_tagihan;
  if not punya_peran(t.wilayah_id, 'bendahara_rt', 'ketua_rt') then raise exception 'Tidak berhak'; end if;
  jml := coalesce(p_nominal, t.nominal - t.terbayar);
  if jml <= 0 then raise exception 'Tagihan sudah lunas'; end if;
  insert into pembayaran_iuran (tagihan_id, wilayah_id, nominal, metode) values (t.id, t.wilayah_id, jml, p_metode);
  update tagihan_iuran set terbayar = terbayar + jml where id = t.id;
end $$;

-- Batalkan pembayaran yang belum dibukukan ke kas (salah centang)
create or replace function public.batal_bayar(p_tagihan uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t tagihan_iuran; jml numeric;
begin
  select * into t from tagihan_iuran where id = p_tagihan;
  if not punya_peran(t.wilayah_id, 'bendahara_rt', 'ketua_rt') then raise exception 'Tidak berhak'; end if;
  select coalesce(sum(nominal), 0) into jml from pembayaran_iuran where tagihan_id = t.id and transaksi_id is null;
  if jml = 0 then raise exception 'Pembayaran sudah dibukukan ke kas, gunakan koreksi kas'; end if;
  delete from pembayaran_iuran where tagihan_id = t.id and transaksi_id is null;
  update tagihan_iuran set terbayar = terbayar - jml where id = t.id;
end $$;

-- Bukukan semua pembayaran iuran yang belum masuk kas menjadi satu transaksi (perlu persetujuan ketua)
create or replace function public.bukukan_iuran(p_wilayah smallint)
returns uuid language plpgsql security definer set search_path = public as $$
declare jml numeric; n integer; baru uuid;
begin
  if not punya_peran(p_wilayah, 'bendahara_rt') then raise exception 'Hanya bendahara yang membukukan iuran'; end if;
  select coalesce(sum(nominal), 0), count(*) into jml, n
    from pembayaran_iuran where wilayah_id = p_wilayah and transaksi_id is null;
  if n = 0 then raise exception 'Tidak ada pembayaran yang belum dibukukan'; end if;
  insert into transaksi_kas (wilayah_id, tipe, kategori, nominal, keterangan)
  values (p_wilayah, 'masuk', 'Iuran warga', jml, 'Rekap ' || n || ' pembayaran iuran')
  returning id into baru;
  update pembayaran_iuran set transaksi_id = baru where wilayah_id = p_wilayah and transaksi_id is null;
  return baru;
end $$;

-- ---------------------------------------------------------------------
-- Rapat
-- ---------------------------------------------------------------------
create table public.rapat (
  id uuid primary key default gen_random_uuid(),
  wilayah_id smallint not null references public.wilayah(id),
  judul text not null,
  mulai timestamptz not null,
  lokasi text,
  agenda text,
  notulen text,
  keputusan text,
  jumlah_hadir integer,
  dibuat_oleh uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.rapat (wilayah_id, mulai);

-- ---------------------------------------------------------------------
-- Audit log (siapa, kapan, data lama, data baru)
-- ---------------------------------------------------------------------
create table public.audit_log (
  id bigserial primary key,
  waktu timestamptz not null default now(),
  user_id uuid,
  tabel text not null,
  record_id text,
  aksi text not null,
  wilayah_id smallint,
  data_lama jsonb,
  data_baru jsonb
);

create or replace function public.tg_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  r := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into audit_log (user_id, tabel, record_id, aksi, wilayah_id, data_lama, data_baru)
  values (auth.uid(), tg_table_name, r->>'id', tg_op, (r->>'wilayah_id')::smallint,
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'pengaturan_wilayah', 'kartu_keluarga', 'penduduk', 'mutasi_penduduk',
                           'transaksi_kas', 'tagihan_iuran', 'pembayaran_iuran', 'rapat']
  loop
    execute format('create trigger audit after insert or update or delete on public.%I
                    for each row execute function public.tg_audit()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.wilayah enable row level security;
alter table public.profiles enable row level security;
alter table public.pengaturan_wilayah enable row level security;
alter table public.kartu_keluarga enable row level security;
alter table public.penduduk enable row level security;
alter table public.mutasi_penduduk enable row level security;
alter table public.transaksi_kas enable row level security;
alter table public.tagihan_iuran enable row level security;
alter table public.pembayaran_iuran enable row level security;
alter table public.rapat enable row level security;
alter table public.audit_log enable row level security;

create policy "wilayah dibaca semua" on public.wilayah for select using (true);

create policy "profil dibaca pengurus" on public.profiles for select
  using (id = auth.uid() or public.is_rw() or wilayah_id = public.my_wilayah());

create policy "pengaturan dibaca" on public.pengaturan_wilayah for select using (public.bisa_lihat(wilayah_id));
create policy "pengaturan diubah ketua" on public.pengaturan_wilayah for update
  using (public.punya_peran(wilayah_id, 'ketua_rt', 'ketua_rw'));

-- Penduduk: lihat sesuai wilayah, tulis oleh ketua/sekretaris RT
create policy "kk dibaca" on public.kartu_keluarga for select using (public.bisa_lihat(wilayah_id));
create policy "kk ditulis" on public.kartu_keluarga for all
  using (public.punya_peran(wilayah_id, 'ketua_rt', 'sekretaris_rt'))
  with check (public.punya_peran(wilayah_id, 'ketua_rt', 'sekretaris_rt'));

create policy "penduduk dibaca" on public.penduduk for select using (public.bisa_lihat(wilayah_id));
create policy "penduduk ditulis" on public.penduduk for all
  using (public.punya_peran(wilayah_id, 'ketua_rt', 'sekretaris_rt'))
  with check (public.punya_peran((select k.wilayah_id from public.kartu_keluarga k where k.id = kk_id), 'ketua_rt', 'sekretaris_rt'));

create policy "mutasi dibaca" on public.mutasi_penduduk for select using (public.bisa_lihat(wilayah_id));
create policy "mutasi ditulis" on public.mutasi_penduduk for insert
  with check (public.punya_peran(wilayah_id, 'ketua_rt', 'sekretaris_rt'));

-- Kas: bendahara mengajukan, ketua menyetujui lewat fungsi setujui_transaksi
create policy "kas dibaca" on public.transaksi_kas for select using (public.bisa_lihat(wilayah_id));
create policy "kas diajukan bendahara" on public.transaksi_kas for insert
  with check (public.punya_peran(wilayah_id, 'bendahara_rt', 'bendahara_rw') and status = 'diajukan');
create policy "kas diedit sebelum disetujui" on public.transaksi_kas for update
  using (public.punya_peran(wilayah_id, 'bendahara_rt', 'bendahara_rw') and status <> 'disetujui')
  with check (status = 'diajukan');
create policy "kas dihapus sebelum disetujui" on public.transaksi_kas for delete
  using (public.punya_peran(wilayah_id, 'bendahara_rt', 'bendahara_rw') and status <> 'disetujui');

create policy "tagihan dibaca" on public.tagihan_iuran for select using (public.bisa_lihat(wilayah_id));
create policy "pembayaran dibaca" on public.pembayaran_iuran for select using (public.bisa_lihat(wilayah_id));

-- Jadwal & notulen rapat bersifat publik
create policy "rapat dibaca semua" on public.rapat for select using (true);
create policy "rapat ditulis" on public.rapat for all
  using (public.punya_peran(wilayah_id, 'ketua_rt', 'sekretaris_rt', 'ketua_rw'))
  with check (public.punya_peran(wilayah_id, 'ketua_rt', 'sekretaris_rt', 'ketua_rw'));

create policy "audit dibaca ketua" on public.audit_log for select
  using (public.is_rw() or (public.my_peran() = 'ketua_rt' and wilayah_id = public.my_wilayah()));

-- ---------------------------------------------------------------------
-- Storage: foto bukti transaksi (dapat dilihat publik demi transparansi)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('bukti', 'bukti', true)
  on conflict (id) do nothing;
create policy "bukti diunggah pengurus" on storage.objects for insert to authenticated
  with check (bucket_id = 'bukti');

-- ---------------------------------------------------------------------
-- Laporan publik (tanpa login) — hanya data keuangan & statistik agregat
-- ---------------------------------------------------------------------
create or replace function public.laporan_publik(p_wilayah smallint, p_bulan date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  b date := date_trunc('month', coalesce(p_bulan, current_date))::date;
  hasil jsonb;
begin
  select jsonb_build_object(
    'wilayah', (select jsonb_build_object('id', id, 'nama', nama, 'tipe', tipe) from wilayah where id = p_wilayah),
    'bulan', b,
    'saldo', (select pw.saldo_awal + coalesce((select sum(case when tipe = 'masuk' then nominal else -nominal end)
                                               from transaksi_kas where wilayah_id = p_wilayah and status = 'disetujui'), 0)
              from pengaturan_wilayah pw where pw.wilayah_id = p_wilayah),
    'masuk_bulan', (select coalesce(sum(nominal), 0) from transaksi_kas
                    where wilayah_id = p_wilayah and status = 'disetujui' and tipe = 'masuk'
                      and tanggal >= b and tanggal < (b + interval '1 month')),
    'keluar_bulan', (select coalesce(sum(nominal), 0) from transaksi_kas
                     where wilayah_id = p_wilayah and status = 'disetujui' and tipe = 'keluar'
                       and tanggal >= b and tanggal < (b + interval '1 month')),
    'transaksi', (select coalesce(jsonb_agg(jsonb_build_object(
                     'id', id, 'tanggal', tanggal, 'tipe', tipe, 'kategori', kategori,
                     'nominal', nominal, 'keterangan', keterangan, 'bukti_path', bukti_path)
                   order by tanggal desc, created_at desc), '[]'::jsonb)
                  from transaksi_kas
                  where wilayah_id = p_wilayah and status = 'disetujui'
                    and tanggal >= b and tanggal < (b + interval '1 month')),
    'penduduk', (select jsonb_build_object(
                    'kk', (select count(*) from kartu_keluarga k join wilayah w on w.id = k.wilayah_id
                           where k.aktif and (w.id = p_wilayah or w.parent_id = p_wilayah)),
                    'jiwa', count(*),
                    'laki', count(*) filter (where jk = 'L'),
                    'perempuan', count(*) filter (where jk = 'P'),
                    'balita', count(*) filter (where age(tgl_lahir) < interval '5 years'),
                    'anak', count(*) filter (where age(tgl_lahir) >= interval '5 years' and age(tgl_lahir) < interval '18 years'),
                    'produktif', count(*) filter (where age(tgl_lahir) >= interval '18 years' and age(tgl_lahir) < interval '60 years'),
                    'lansia', count(*) filter (where age(tgl_lahir) >= interval '60 years'))
                 from penduduk p join wilayah w on w.id = p.wilayah_id
                 where p.status = 'aktif' and (w.id = p_wilayah or w.parent_id = p_wilayah)),
    'iuran', (select jsonb_build_object(
                 'total_kk', count(*),
                 'lunas', count(*) filter (where terbayar >= nominal),
                 'terkumpul', coalesce(sum(terbayar), 0),
                 'target', coalesce(sum(nominal), 0))
              from tagihan_iuran where wilayah_id = p_wilayah and periode = b),
    'rapat_mendatang', (select coalesce(jsonb_agg(jsonb_build_object(
                           'id', id, 'judul', judul, 'mulai', mulai, 'lokasi', lokasi, 'agenda', agenda) order by mulai), '[]'::jsonb)
                        from (select * from rapat where (wilayah_id = p_wilayah or wilayah_id = 1) and mulai >= now()
                              order by mulai limit 5) r),
    'notulen', (select coalesce(jsonb_agg(jsonb_build_object(
                   'id', id, 'judul', judul, 'mulai', mulai, 'notulen', notulen, 'keputusan', keputusan,
                   'jumlah_hadir', jumlah_hadir) order by mulai desc), '[]'::jsonb)
                from (select * from rapat where wilayah_id = p_wilayah and mulai < now() and notulen is not null
                      order by mulai desc limit 5) r)
  ) into hasil;
  return hasil;
end $$;

grant execute on function public.laporan_publik(smallint, date) to anon, authenticated;

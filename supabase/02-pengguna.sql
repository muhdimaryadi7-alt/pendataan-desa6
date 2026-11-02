-- =====================================================================
-- Kelola pengurus tanpa Secret key:
-- akun dibuat di Supabase > Authentication > Users > Add user,
-- lalu Super Admin / Ketua RW menetapkan perannya dari menu Pengguna.
-- =====================================================================

-- Akun login yang belum punya peran pengurus
create or replace function public.akun_belum_terdaftar()
returns table (id uuid, email text, dibuat timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce(public.my_peran() not in ('super_admin', 'ketua_rw'), true) then
    raise exception 'Tidak berhak';
  end if;
  return query
    select u.id, u.email::text, u.created_at
      from auth.users u
     where not exists (select 1 from public.profiles p where p.id = u.id)
     order by u.created_at desc;
end $$;

-- Tetapkan (atau ubah / aktifkan kembali) peran seorang pengurus
create or replace function public.tetapkan_peran(p_user uuid, p_nama text, p_peran public.peran, p_wilayah smallint)
returns void language plpgsql security definer set search_path = public as $$
declare w smallint;
begin
  if coalesce(public.my_peran() not in ('super_admin', 'ketua_rw'), true) then
    raise exception 'Tidak berhak';
  end if;
  if p_peran = 'super_admin' and public.my_peran() <> 'super_admin' then
    raise exception 'Hanya Super Admin yang dapat menetapkan Super Admin';
  end if;
  if public.my_peran() <> 'super_admin'
     and (select peran from profiles where id = p_user) = 'super_admin' then
    raise exception 'Tidak berhak mengubah Super Admin';
  end if;
  if p_user = auth.uid() then raise exception 'Tidak dapat mengubah peran sendiri'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'Akun tidak ditemukan'; end if;

  -- Pengurus RT wajib memilih RT; pengurus RW selalu di RW 01
  if p_peran in ('ketua_rt', 'sekretaris_rt', 'bendahara_rt') then
    if p_wilayah not in (select id from wilayah where tipe = 'rt') then raise exception 'Pilih RT untuk pengurus RT'; end if;
    w := p_wilayah;
  else
    w := (select id from wilayah where tipe = 'rw' limit 1);
  end if;

  insert into profiles (id, nama, peran, wilayah_id, aktif)
  values (p_user, coalesce(nullif(trim(p_nama), ''), 'Pengurus'), p_peran, w, true)
  on conflict (id) do update
    set nama = excluded.nama, peran = excluded.peran, wilayah_id = excluded.wilayah_id, aktif = true;
end $$;

-- Nonaktifkan pengurus: tidak bisa lagi mengakses data, riwayatnya tetap utuh
create or replace function public.nonaktifkan_pengguna(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.my_peran() not in ('super_admin', 'ketua_rw'), true) then
    raise exception 'Tidak berhak';
  end if;
  if p_user = auth.uid() then raise exception 'Tidak dapat menonaktifkan akun sendiri'; end if;
  if public.my_peran() <> 'super_admin'
     and (select peran from profiles where id = p_user) = 'super_admin' then
    raise exception 'Tidak berhak menonaktifkan Super Admin';
  end if;
  update profiles set aktif = false where id = p_user;
end $$;

-- Hanya pengguna yang login; pengecekan peran tetap dilakukan di dalam fungsi
revoke execute on function public.akun_belum_terdaftar() from public, anon;
revoke execute on function public.tetapkan_peran(uuid, text, public.peran, smallint) from public, anon;
revoke execute on function public.nonaktifkan_pengguna(uuid) from public, anon;
grant execute on function public.akun_belum_terdaftar() to authenticated;
grant execute on function public.tetapkan_peran(uuid, text, public.peran, smallint) to authenticated;
grant execute on function public.nonaktifkan_pengguna(uuid) to authenticated;

-- Opsional: akun pemilik otomatis menjadi Super Admin saat dibuat di
-- Supabase > Authentication > Users > Add user. Ganti email sesuai pemilik.
create or replace function public.tg_super_admin_awal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = 'muhdimaryadi7@gmail.com' then
    insert into public.profiles (id, nama, peran, wilayah_id)
    values (new.id, 'Muhdi Maryadi', 'super_admin', 1)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists super_admin_awal on auth.users;
create trigger super_admin_awal after insert on auth.users
  for each row execute function public.tg_super_admin_awal();

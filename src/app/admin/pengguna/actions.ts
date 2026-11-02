'use server'
import { kembali, teks } from '@/lib/aksi'
import { createClient } from '@/lib/supabase/server'

// Hak akses dicek di database (fungsi tetapkan_peran & nonaktifkan_pengguna)
export async function tetapkanPeran(f: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('tetapkan_peran', {
    p_user: teks(f, 'id'),
    p_nama: teks(f, 'nama'),
    p_peran: teks(f, 'peran'),
    p_wilayah: Number(f.get('wilayah_id')),
  })
  kembali('/admin/pengguna', error ? { galat: error.message } : { pesan: 'Peran pengurus disimpan. Ia sudah bisa login.' })
}

export async function nonaktifkan(f: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('nonaktifkan_pengguna', { p_user: teks(f, 'id') })
  kembali('/admin/pengguna', error ? { galat: error.message } : { pesan: 'Pengurus dinonaktifkan. Riwayatnya tetap tersimpan.' })
}

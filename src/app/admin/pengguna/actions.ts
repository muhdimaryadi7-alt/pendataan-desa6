'use server'
import { kembali, teks } from '@/lib/aksi'
import { getProfil, type Peran } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

const PERAN_RT: Peran[] = ['ketua_rt', 'sekretaris_rt', 'bendahara_rt']

export async function buatPengguna(f: FormData) {
  const profil = await getProfil()
  if (!['super_admin', 'ketua_rw'].includes(profil.peran)) kembali('/admin/pengguna', { galat: 'Tidak berhak.' })

  const peran = teks(f, 'peran') as Peran
  const wilayah = PERAN_RT.includes(peran) ? Number(f.get('wilayah_id')) : 1
  if (peran === 'super_admin' && profil.peran !== 'super_admin') kembali('/admin/pengguna', { galat: 'Hanya Super Admin yang dapat membuat Super Admin.' })
  if (PERAN_RT.includes(peran) && ![2, 3].includes(wilayah)) kembali('/admin/pengguna', { galat: 'Pilih RT untuk peran pengurus RT.' })

  const password = (f.get('password') as string) ?? ''
  if (password.length < 8) kembali('/admin/pengguna', { galat: 'Password minimal 8 karakter.' })

  const admin = createServiceClient()
  const { data, error } = await admin.auth.admin.createUser({ email: teks(f, 'email')!, password, email_confirm: true })
  if (error) kembali('/admin/pengguna', { galat: `Gagal membuat akun: ${error.message}` })
  const { error: e2 } = await admin.from('profiles').insert({ id: data.user.id, nama: teks(f, 'nama'), peran, wilayah_id: wilayah })
  if (e2) {
    await admin.auth.admin.deleteUser(data.user.id)
    kembali('/admin/pengguna', { galat: e2.message })
  }
  kembali('/admin/pengguna', { pesan: 'Akun pengurus dibuat. Berikan email & password kepada yang bersangkutan.' })
}

export async function hapusPengguna(f: FormData) {
  const profil = await getProfil()
  const id = teks(f, 'id')!
  if (!['super_admin', 'ketua_rw'].includes(profil.peran) || id === profil.id) kembali('/admin/pengguna', { galat: 'Tidak berhak.' })
  const admin = createServiceClient()
  const { data: target } = await admin.from('profiles').select('peran').eq('id', id).single()
  if (target?.peran === 'super_admin' && profil.peran !== 'super_admin') kembali('/admin/pengguna', { galat: 'Tidak berhak.' })
  // Akun tidak dihapus agar riwayat transaksi & audit tetap utuh; cukup diblokir
  const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: '876000h' })
  if (!error) await admin.from('profiles').update({ aktif: false }).eq('id', id)
  kembali('/admin/pengguna', error ? { galat: error.message } : { pesan: 'Akun dinonaktifkan.' })
}

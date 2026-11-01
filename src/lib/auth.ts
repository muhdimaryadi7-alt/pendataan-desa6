import 'server-only'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from './supabase/server'

export type Peran =
  | 'super_admin'
  | 'ketua_rw'
  | 'bendahara_rw'
  | 'ketua_rt'
  | 'sekretaris_rt'
  | 'bendahara_rt'

export type Profil = { id: string; nama: string; peran: Peran; wilayah_id: number }

export const NAMA_PERAN: Record<Peran, string> = {
  super_admin: 'Super Admin',
  ketua_rw: 'Ketua RW',
  bendahara_rw: 'Bendahara RW',
  ketua_rt: 'Ketua RT',
  sekretaris_rt: 'Sekretaris RT',
  bendahara_rt: 'Bendahara RT',
}

export const WILAYAH = [
  { id: 1, nama: 'RW 01', tipe: 'rw' },
  { id: 2, nama: 'RT 01', tipe: 'rt' },
  { id: 3, nama: 'RT 02', tipe: 'rt' },
] as const

export const namaWilayah = (id: number) => WILAYAH.find((w) => w.id === id)?.nama ?? '-'

export const isRW = (p: Profil) => ['super_admin', 'ketua_rw', 'bendahara_rw'].includes(p.peran)

export const getProfil = cache(async (): Promise<Profil> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data } = await supabase.from('profiles').select('id, nama, peran, wilayah_id, aktif').eq('id', user.id).single()
  if (!data?.aktif) redirect('/login?galat=profil')
  return data as Profil
})

// Wilayah yang sedang dilihat: pengurus RT terkunci ke RT-nya, pengurus RW memilih lewat ?w=
export function pilihWilayah(profil: Profil, w: string | string[] | undefined, bolehRW = true): number {
  if (!isRW(profil)) return profil.wilayah_id
  const n = Number(Array.isArray(w) ? w[0] : w)
  if (WILAYAH.some((x) => x.id === n) && (bolehRW || n !== 1)) return n
  return bolehRW ? 1 : 2
}

// Peran yang boleh menulis di wilayah tertentu (cerminan fungsi punya_peran di database)
export function boleh(profil: Profil, wilayah: number, ...peran: Peran[]) {
  return profil.peran === 'super_admin' || (profil.wilayah_id === wilayah && peran.includes(profil.peran))
}

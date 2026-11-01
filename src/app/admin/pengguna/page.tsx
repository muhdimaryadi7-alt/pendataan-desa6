import { redirect } from 'next/navigation'
import { Card, Field, Input, Pesan, Select } from '@/components/ui'
import { Submit } from '@/components/submit'
import { getProfil, NAMA_PERAN, namaWilayah, type Peran } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { buatPengguna, hapusPengguna } from './actions'

export default async function PenggunaPage({ searchParams }: PageProps<'/admin/pengguna'>) {
  const sp = await searchParams
  const profil = await getProfil()
  if (!['super_admin', 'ketua_rw'].includes(profil.peran)) redirect('/admin')
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('id, nama, peran, wilayah_id').eq('aktif', true).order('wilayah_id').order('peran')
  const peranTersedia = (Object.keys(NAMA_PERAN) as Peran[]).filter((p) => p !== 'super_admin' || profil.peran === 'super_admin')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Pengguna (Pengurus)</h1>
      <Pesan sp={sp} />
      <Card title="Daftar pengurus">
        <ul className="divide-y divide-slate-100 text-sm">
          {(data ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2">
              <div>
                <div className="font-medium">{p.nama}</div>
                <div className="text-xs text-slate-500">{NAMA_PERAN[p.peran as Peran]} · {namaWilayah(p.wilayah_id)}</div>
              </div>
              {p.id !== profil.id && (p.peran !== 'super_admin' || profil.peran === 'super_admin') && (
                <form action={hapusPengguna}>
                  <input type="hidden" name="id" value={p.id} />
                  <Submit varian="kedua" className="!px-2 !py-1 text-xs text-red-600" konfirmasi={`Nonaktifkan akun ${p.nama}? Ia tidak bisa login lagi; riwayatnya tetap tersimpan.`}>Nonaktifkan</Submit>
                </form>
              )}
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Tambah pengurus">
        <form action={buatPengguna} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama"><Input name="nama" required /></Field>
          <Field label="Email (untuk login)"><Input name="email" type="email" required /></Field>
          <Field label="Password awal (min. 8 karakter)"><Input name="password" type="text" minLength={8} required /></Field>
          <Field label="Peran">
            <Select name="peran">{peranTersedia.map((p) => <option key={p} value={p}>{NAMA_PERAN[p]}</option>)}</Select>
          </Field>
          <Field label="RT (untuk pengurus RT)">
            <Select name="wilayah_id"><option value="2">RT 01</option><option value="3">RT 02</option></Select>
          </Field>
          <div className="flex items-end"><Submit>Buat akun</Submit></div>
        </form>
      </Card>
    </div>
  )
}

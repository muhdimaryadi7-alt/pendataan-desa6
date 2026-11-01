import Link from 'next/link'
import { Badge, Card, Field, Input, Kosong, Pesan, PilihWilayah, Select, Textarea } from '@/components/ui'
import { Submit } from '@/components/submit'
import { boleh, getProfil, isRW, namaWilayah, pilihWilayah, WILAYAH } from '@/lib/auth'
import { tanggalJam } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { buatRapat } from './actions'

type Rapat = { id: string; judul: string; mulai: string; lokasi: string | null; wilayah_id: number; notulen: string | null }

export default async function RapatPage({ searchParams }: PageProps<'/admin/rapat'>) {
  const sp = await searchParams
  const profil = await getProfil()
  const w = pilihWilayah(profil, sp.w)
  const supabase = await createClient()
  const sekarang = new Date().toISOString()

  // Rapat RT ditampilkan bersama rapat RW (yang juga berlaku untuk warga RT)
  const wilayahTampil = w === 1 ? [1] : [w, 1]
  const [{ data: mendatang }, { data: lalu }] = await Promise.all([
    supabase.from('rapat').select('id, judul, mulai, lokasi, wilayah_id, notulen').in('wilayah_id', wilayahTampil).gte('mulai', sekarang).order('mulai').limit(24),
    supabase.from('rapat').select('id, judul, mulai, lokasi, wilayah_id, notulen').in('wilayah_id', wilayahTampil).lt('mulai', sekarang).order('mulai', { ascending: false }).limit(24),
  ])
  const bisaTulis = boleh(profil, w, 'ketua_rt', 'sekretaris_rt', 'ketua_rw')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Kalender Rapat</h1>
      <PilihWilayah path="/admin/rapat" aktif={w} opsi={isRW(profil) ? [...WILAYAH] : []} />
      <Pesan sp={sp} />

      {bisaTulis && (
        <details className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <summary className="cursor-pointer font-semibold text-emerald-800">+ Buat jadwal rapat {namaWilayah(w)}</summary>
          <form action={buatRapat} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="wilayah_id" value={w} />
            <Field label="Judul"><Input name="judul" required defaultValue={`Rapat rutin ${namaWilayah(w)}`} /></Field>
            <Field label="Lokasi"><Input name="lokasi" placeholder="Rumah Ketua RT / Balai warga" /></Field>
            <Field label="Tanggal (pertama)"><Input type="date" name="tanggal" required /></Field>
            <Field label="Jam (WIB)"><Input type="time" name="jam" defaultValue="19:30" required /></Field>
            <Field label="Ulangi">
              <Select name="ulang" defaultValue="6">
                <option value="1">Sekali saja</option>
                <option value="3">Tiap bulan, 3 bulan</option>
                <option value="6">Tiap bulan, 6 bulan</option>
                <option value="12">Tiap bulan, 12 bulan</option>
              </Select>
            </Field>
            <Field label="Agenda"><Textarea name="agenda" placeholder={'1. Iuran bulanan\n2. Laporan kas\n3. Lain-lain'} /></Field>
            <p className="text-xs text-slate-500 sm:col-span-2">Jadwal berulang mengikuti pola &quot;minggu ke-n, hari yang sama&quot;. Contoh: tanggal pertama Minggu 1 Nov → setiap Minggu pertama tiap bulan.</p>
            <div className="sm:col-span-2"><Submit>Simpan jadwal</Submit></div>
          </form>
        </details>
      )}

      <Card title="Akan datang">
        <Daftar rapat={(mendatang ?? []) as Rapat[]} kosong="Belum ada jadwal." />
      </Card>
      <Card title="Sudah lewat">
        <Daftar rapat={(lalu ?? []) as Rapat[]} kosong="Belum ada rapat." lalu />
      </Card>
    </div>
  )
}

function Daftar({ rapat, kosong, lalu }: { rapat: Rapat[]; kosong: string; lalu?: boolean }) {
  if (!rapat.length) return <Kosong>{kosong}</Kosong>
  return (
    <ul className="divide-y divide-slate-100">
      {rapat.map((r) => (
        <li key={r.id}>
          <Link href={`/admin/rapat/${r.id}`} className="flex items-center justify-between gap-2 py-2.5 text-sm hover:bg-slate-50">
            <div>
              <div className="font-medium">{r.judul} <Badge warna={r.wilayah_id === 1 ? 'blue' : 'slate'}>{namaWilayah(r.wilayah_id)}</Badge></div>
              <div className="text-slate-500">{tanggalJam(r.mulai)}{r.lokasi && ` · ${r.lokasi}`}</div>
            </div>
            {lalu && (r.notulen ? <Badge warna="green">notulen ada</Badge> : <Badge warna="amber">isi notulen</Badge>)}
          </Link>
        </li>
      ))}
    </ul>
  )
}

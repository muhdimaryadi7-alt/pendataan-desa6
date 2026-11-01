import Link from 'next/link'
import { Badge, Card, Field, Input, Kosong, Pesan, PilihWilayah, Select } from '@/components/ui'
import { Submit } from '@/components/submit'
import { boleh, getProfil, isRW, pilihWilayah, WILAYAH } from '@/lib/auth'
import { umur } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { tambahKK } from './actions'
import { IsianAnggota } from './form-anggota'

type KK = {
  id: string; no_kk: string; alamat: string; status_hunian: string; aktif: boolean
  penduduk: { id: string; nama: string; nik: string; hubungan: string; jk: string; tgl_lahir: string | null; status: string }[]
}

export default async function PendudukPage({ searchParams }: PageProps<'/admin/penduduk'>) {
  const sp = await searchParams
  const profil = await getProfil()
  const w = pilihWilayah(profil, sp.w, false)
  const q = typeof sp.q === 'string' ? sp.q.trim() : ''
  const supabase = await createClient()

  const { data } = await supabase
    .from('kartu_keluarga')
    .select('id, no_kk, alamat, status_hunian, aktif, penduduk(id, nama, nik, hubungan, jk, tgl_lahir, status)')
    .eq('wilayah_id', w)
    .order('alamat')
  let daftar = (data ?? []) as KK[]
  if (q) {
    const s = q.toLowerCase()
    daftar = daftar.filter(
      (k) => k.no_kk.includes(s) || k.alamat.toLowerCase().includes(s) || k.penduduk.some((p) => p.nama.toLowerCase().includes(s) || p.nik.includes(s)),
    )
  }
  const aktif = daftar.flatMap((k) => k.penduduk).filter((p) => p.status === 'aktif')
  const bisaTulis = boleh(profil, w, 'ketua_rt', 'sekretaris_rt')

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Data Penduduk</h1>
      <p className="mb-4 text-sm text-slate-500">
        {daftar.length} KK · {aktif.length} jiwa aktif · L {aktif.filter((p) => p.jk === 'L').length} / P {aktif.filter((p) => p.jk === 'P').length}
      </p>
      <PilihWilayah path="/admin/penduduk" aktif={w} opsi={isRW(profil) ? WILAYAH.filter((x) => x.tipe === 'rt') : []} />
      <Pesan sp={sp} />

      <form className="mb-4 flex gap-2">
        <input type="hidden" name="w" value={w} />
        <Input name="q" defaultValue={q} placeholder="Cari nama, NIK, No. KK, atau alamat" />
        <button className="rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white">Cari</button>
      </form>

      {bisaTulis && (
        <details className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <summary className="cursor-pointer font-semibold text-emerald-800">+ Tambah Kartu Keluarga</summary>
          <form action={tambahKK} className="mt-4 space-y-3">
            <input type="hidden" name="wilayah_id" value={w} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="No. KK (16 digit)"><Input name="no_kk" required pattern="[0-9]{16}" inputMode="numeric" /></Field>
              <Field label="Alamat"><Input name="alamat" required placeholder="Jl. Melati No. 5" /></Field>
              <Field label="Status hunian">
                <Select name="status_hunian">
                  <option value="tetap">Tetap (kena iuran)</option>
                  <option value="kontrak">Kontrak (tidak iuran)</option>
                  <option value="kos">Kos (tidak iuran)</option>
                </Select>
              </Field>
            </div>
            <Field label="Keluarga ini">
              <Select name="asal"><option value="lama">Warga lama</option><option value="masuk">Pindah masuk (dicatat sebagai mutasi)</option></Select>
            </Field>
            <p className="pt-2 text-sm font-semibold text-slate-700">Kepala keluarga</p>
            <IsianAnggota hubunganTetap="Kepala Keluarga" />
            <Submit>Simpan KK</Submit>
          </form>
        </details>
      )}

      <div className="space-y-3">
        {daftar.length === 0 && <Kosong>Belum ada data KK{q && ' yang cocok'}.</Kosong>}
        {daftar.map((k) => {
          const kepala = k.penduduk.find((p) => p.hubungan === 'Kepala Keluarga') ?? k.penduduk[0]
          return (
            <Card key={k.id}>
              <Link href={`/admin/penduduk/${k.id}`} className="block">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{kepala?.nama ?? '(belum ada anggota)'}</div>
                    <div className="text-xs text-slate-500">KK {k.no_kk} · {k.alamat}</div>
                  </div>
                  <div className="flex gap-1">
                    <Badge warna={k.status_hunian === 'tetap' ? 'green' : 'blue'}>{k.status_hunian}</Badge>
                    {!k.aktif && <Badge warna="red">nonaktif</Badge>}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-slate-600">
                  {k.penduduk.map((p) => (
                    <span key={p.id} className={`rounded bg-slate-100 px-2 py-0.5 ${p.status !== 'aktif' ? 'line-through opacity-60' : ''}`}>
                      {p.nama} ({p.jk}{umur(p.tgl_lahir) !== null ? `, ${umur(p.tgl_lahir)} th` : ''})
                    </span>
                  ))}
                </div>
              </Link>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

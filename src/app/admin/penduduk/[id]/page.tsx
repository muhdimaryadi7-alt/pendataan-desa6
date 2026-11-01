import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge, Card, Field, Input, Pesan, Select } from '@/components/ui'
import { Submit } from '@/components/submit'
import { boleh, getProfil, namaWilayah } from '@/lib/auth'
import { tanggal, umur } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { catatMutasi, hapusAnggota, tambahAnggota, ubahAnggota, ubahKK } from '../actions'
import { type Anggota, IsianAnggota } from '../form-anggota'

export default async function DetailKK({ params, searchParams }: PageProps<'/admin/penduduk/[id]'>) {
  const { id } = await params
  const sp = await searchParams
  const profil = await getProfil()
  const supabase = await createClient()

  const { data: kk } = await supabase
    .from('kartu_keluarga')
    .select('id, no_kk, alamat, status_hunian, aktif, wilayah_id, penduduk(*)')
    .eq('id', id)
    .single()
  if (!kk) notFound()
  const anggota = (kk.penduduk as Anggota[]).sort((a, b) => (a.hubungan === 'Kepala Keluarga' ? -1 : b.hubungan === 'Kepala Keluarga' ? 1 : 0))
  const { data: mutasi } = await supabase
    .from('mutasi_penduduk')
    .select('id, jenis, tanggal, keterangan, penduduk_id')
    .in('penduduk_id', anggota.map((a) => a.id))
    .order('tanggal', { ascending: false })
  const bisaTulis = boleh(profil, kk.wilayah_id, 'ketua_rt', 'sekretaris_rt')
  const nama = (pid: string) => anggota.find((a) => a.id === pid)?.nama ?? '-'

  return (
    <div className="space-y-4">
      <Link href={`/admin/penduduk?w=${kk.wilayah_id}`} className="text-sm text-emerald-700">← Daftar KK {namaWilayah(kk.wilayah_id)}</Link>
      <Pesan sp={sp} />

      <Card title={`KK ${kk.no_kk}`} aksi={<Badge warna={kk.status_hunian === 'tetap' ? 'green' : 'blue'}>{kk.status_hunian}</Badge>}>
        {bisaTulis ? (
          <form action={ubahKK} className="grid gap-3 sm:grid-cols-4 sm:items-end">
            <input type="hidden" name="id" value={kk.id} />
            <Field label="No. KK"><Input name="no_kk" defaultValue={kk.no_kk} required pattern="[0-9]{16}" /></Field>
            <Field label="Alamat"><Input name="alamat" defaultValue={kk.alamat} required /></Field>
            <Field label="Status hunian">
              <Select name="status_hunian" defaultValue={kk.status_hunian}>
                <option value="tetap">Tetap (kena iuran)</option>
                <option value="kontrak">Kontrak</option>
                <option value="kos">Kos</option>
              </Select>
            </Field>
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="aktif" defaultChecked={kk.aktif} /> Aktif</label>
              <Submit varian="kedua">Simpan</Submit>
            </div>
          </form>
        ) : (
          <p className="text-sm text-slate-600">{kk.alamat} · {kk.aktif ? 'Aktif' : 'Nonaktif'}</p>
        )}
      </Card>

      <Card title={`Anggota keluarga (${anggota.length})`}>
        <div className="divide-y divide-slate-100">
          {anggota.map((a) => (
            <div key={a.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {a.nama} {a.status !== 'aktif' && <Badge warna="red">{a.status}</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">
                    {a.hubungan} · NIK {a.nik} · {a.jk === 'L' ? 'Laki-laki' : 'Perempuan'}
                    {a.tgl_lahir && ` · ${tanggal(a.tgl_lahir)} (${umur(a.tgl_lahir)} th)`}
                    {a.pekerjaan && ` · ${a.pekerjaan}`}
                  </div>
                </div>
              </div>
              {bisaTulis && (
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  <details className="w-full">
                    <summary className="cursor-pointer text-emerald-700">Ubah data</summary>
                    <form action={ubahAnggota} className="mt-3 space-y-3">
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="kk_id" value={kk.id} />
                      <IsianAnggota a={a} />
                      <Submit varian="kedua">Simpan perubahan</Submit>
                    </form>
                  </details>
                  {a.status === 'aktif' && (
                    <details className="w-full">
                      <summary className="cursor-pointer text-amber-700">Catat meninggal / pindah keluar</summary>
                      <form action={catatMutasi} className="mt-3 grid gap-3 sm:grid-cols-4 sm:items-end">
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="kk_id" value={kk.id} />
                        <input type="hidden" name="wilayah_id" value={kk.wilayah_id} />
                        <Field label="Jenis"><Select name="jenis"><option value="keluar">Pindah keluar</option><option value="meninggal">Meninggal</option></Select></Field>
                        <Field label="Tanggal"><Input type="date" name="tanggal" /></Field>
                        <Field label="Keterangan"><Input name="keterangan" /></Field>
                        <Submit varian="kedua" konfirmasi={`Catat mutasi untuk ${a.nama}?`}>Catat</Submit>
                      </form>
                    </details>
                  )}
                  <form action={hapusAnggota}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="kk_id" value={kk.id} />
                    <Submit varian="kedua" className="!px-2 !py-1 text-xs text-red-600" konfirmasi={`Hapus ${a.nama}? Gunakan hanya untuk salah input; untuk pindah/meninggal pakai "Catat mutasi".`}>
                      Hapus (salah input)
                    </Submit>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {bisaTulis && (
        <Card title="Tambah anggota keluarga">
          <form action={tambahAnggota} className="space-y-3">
            <input type="hidden" name="kk_id" value={kk.id} />
            <input type="hidden" name="wilayah_id" value={kk.wilayah_id} />
            <IsianAnggota />
            <Field label="Keterangan">
              <Select name="asal">
                <option value="lama">Anggota lama (input awal)</option>
                <option value="lahir">Kelahiran baru</option>
                <option value="masuk">Pindah masuk</option>
              </Select>
            </Field>
            <Submit>Tambah anggota</Submit>
          </form>
        </Card>
      )}

      <Card title="Riwayat mutasi">
        {mutasi?.length ? (
          <ul className="space-y-1 text-sm">
            {mutasi.map((m) => (
              <li key={m.id}>
                <b>{tanggal(m.tanggal)}</b> — {nama(m.penduduk_id)}: <Badge>{m.jenis}</Badge> {m.keterangan}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Belum ada mutasi.</p>
        )}
      </Card>
    </div>
  )
}

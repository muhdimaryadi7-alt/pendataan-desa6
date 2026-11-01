import Link from 'next/link'
import { Badge, Card, Field, Input, Kosong, Pesan, PilihWilayah, Select, Stat } from '@/components/ui'
import { InputBukti } from '@/components/input-bukti'
import { Submit } from '@/components/submit'
import { boleh, getProfil, isRW, pilihWilayah, WILAYAH } from '@/lib/auth'
import { awalBulan, namaBulan, rupiah, tanggal, urlBukti } from '@/lib/format'
import type { Laporan } from '@/lib/laporan'
import { createClient } from '@/lib/supabase/server'
import { ajukanUlang, hapusTransaksi, koreksi, putuskan, tambahTransaksi } from './actions'

type Trx = {
  id: string; tanggal: string; tipe: 'masuk' | 'keluar'; kategori: string; nominal: number; keterangan: string | null
  bukti_path: string | null; status: string; alasan_tolak: string | null; reversal_of: string | null
  pembuat: { nama: string } | null; penyetuju: { nama: string } | null
}

const KATEGORI_KELUAR = ['Kebersihan', 'Keamanan', 'Sosial / duka', 'Kegiatan', 'Operasional', 'Setoran RW', 'Lainnya']
const KATEGORI_MASUK = ['Donasi', 'Sewa fasilitas', 'Bantuan desa / pemerintah', 'Kegiatan', 'Lainnya']

function Bukti({ path }: { path: string | null }) {
  const url = urlBukti(path)
  return url ? <a href={url} target="_blank" className="text-emerald-700 underline">bukti</a> : <span className="text-slate-400">—</span>
}

export default async function KasPage({ searchParams }: PageProps<'/admin/kas'>) {
  const sp = await searchParams
  const profil = await getProfil()
  const w = pilihWilayah(profil, sp.w)
  const bulan = awalBulan(sp.bulan)
  const supabase = await createClient()

  const { data: lap } = await supabase.rpc('laporan_publik', { p_wilayah: w, p_bulan: bulan })
  const laporan = lap as Laporan
  const { data } = await supabase
    .from('transaksi_kas')
    .select('*, pembuat:profiles!transaksi_kas_dibuat_oleh_fkey(nama), penyetuju:profiles!transaksi_kas_disetujui_oleh_fkey(nama)')
    .eq('wilayah_id', w)
    .or(`status.neq.disetujui,and(tanggal.gte.${bulan},tanggal.lt.${bulanBerikut(bulan)})`)
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false })
  const trx = (data ?? []) as Trx[]
  const menunggu = trx.filter((t) => t.status === 'diajukan')
  const ditolak = trx.filter((t) => t.status === 'ditolak')
  const disetujui = trx.filter((t) => t.status === 'disetujui')

  const bendahara = boleh(profil, w, 'bendahara_rt', 'bendahara_rw')
  const ketua = boleh(profil, w, 'ketua_rt', 'ketua_rw')
  const isRT = w !== 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Buku Kas</h1>
          <p className="text-sm text-slate-500">{namaBulan(bulan)}</p>
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="w" value={w} />
          <Input type="month" name="bulan" defaultValue={bulan.slice(0, 7)} className="!w-auto" />
          <button className="rounded-lg bg-slate-800 px-3 text-sm font-semibold text-white">Lihat</button>
        </form>
      </div>
      <PilihWilayah path="/admin/kas" aktif={w} opsi={isRW(profil) ? [...WILAYAH] : []} />
      <Pesan sp={sp} />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Saldo" nilai={rupiah(laporan?.saldo)} warna="text-emerald-700" />
        <Stat label="Masuk" nilai={rupiah(laporan?.masuk_bulan)} />
        <Stat label="Keluar" nilai={rupiah(laporan?.keluar_bulan)} />
      </div>

      {menunggu.length > 0 && (
        <Card title={`Menunggu persetujuan (${menunggu.length})`} className="border-amber-200">
          <div className="divide-y divide-slate-100">
            {menunggu.map((t) => (
              <div key={t.id} className="py-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <b className={t.tipe === 'masuk' ? 'text-emerald-700' : 'text-red-700'}>{t.tipe === 'masuk' ? '+' : '−'}{rupiah(t.nominal)}</b>{' '}
                    {t.kategori} · {tanggal(t.tanggal)}
                    <div className="text-slate-500">{t.keterangan} · oleh {t.pembuat?.nama ?? '-'} · <Bukti path={t.bukti_path} /></div>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    {ketua && (
                      <>
                        <form action={putuskan}>
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="wilayah_id" value={w} />
                          <input type="hidden" name="setuju" value="1" />
                          <Submit konfirmasi={`Setujui ${t.kategori} ${rupiah(t.nominal)}? Setelah disetujui transaksi tidak bisa diubah.`}>Setujui</Submit>
                        </form>
                        <form action={putuskan} className="flex gap-1">
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="wilayah_id" value={w} />
                          <input type="hidden" name="setuju" value="0" />
                          <Input name="alasan" placeholder="Alasan tolak" required className="!w-36" />
                          <Submit varian="kedua">Tolak</Submit>
                        </form>
                      </>
                    )}
                    {bendahara && (
                      <form action={hapusTransaksi}>
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="wilayah_id" value={w} />
                        <Submit varian="kedua" konfirmasi="Hapus pengajuan ini?">Hapus</Submit>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {ditolak.length > 0 && (
        <Card title="Ditolak — perlu diperbaiki">
          {ditolak.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div>
                {t.kategori} {rupiah(t.nominal)} · {tanggal(t.tanggal)}
                <div className="text-red-700">Alasan: {t.alasan_tolak}</div>
              </div>
              {bendahara && (
                <div className="flex gap-2">
                  <form action={ajukanUlang}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="wilayah_id" value={w} /><Submit varian="kedua">Ajukan ulang</Submit></form>
                  <form action={hapusTransaksi}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="wilayah_id" value={w} /><Submit varian="kedua">Hapus</Submit></form>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {bendahara && (
        <details className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <summary className="cursor-pointer font-semibold text-emerald-800">+ Catat transaksi</summary>
          <form action={tambahTransaksi} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="wilayah_id" value={w} />
            <Field label="Jenis & kategori">
              <Select name="kategori">
                <optgroup label="Pengeluaran">
                  {KATEGORI_KELUAR.filter((k) => isRT || k !== 'Setoran RW').map((k) => <option key={`k-${k}`} value={`keluar|${k}`}>{k}</option>)}
                </optgroup>
                <optgroup label="Pemasukan lain (iuran dicatat di menu Iuran)">
                  {KATEGORI_MASUK.map((k) => <option key={`m-${k}`} value={`masuk|${k}`}>{k}</option>)}
                </optgroup>
              </Select>
            </Field>
            <Field label="Tanggal"><Input type="date" name="tanggal" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
            <Field label="Nominal (Rp)"><Input name="nominal" inputMode="numeric" required placeholder="150000" /></Field>
            <Field label="Keterangan"><Input name="keterangan" placeholder="Beli kantong sampah 3 pak" /></Field>
            <Field label="Foto nota / bukti"><InputBukti wajibInfo="Wajib untuk pengeluaran ≥ Rp100.000" /></Field>
            <div className="sm:col-span-2"><Submit>Ajukan transaksi</Submit></div>
          </form>
          {isRT && <p className="mt-3 text-xs text-slate-500">Setoran ke RW: pilih kategori &quot;Setoran RW&quot;. Setelah disetujui Ketua RT, otomatis tercatat sebagai pemasukan kas RW.</p>}
        </details>
      )}

      <Card title="Transaksi disetujui" aksi={<Link href={`/?w=${w}&bulan=${bulan.slice(0, 7)}`} className="text-sm text-emerald-700">Laporan publik →</Link>}>
        {disetujui.length === 0 ? (
          <Kosong>Belum ada transaksi disetujui bulan ini.</Kosong>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr><th className="py-2">Tanggal</th><th>Kategori</th><th>Keterangan</th><th className="text-right">Nominal</th><th>Bukti</th><th>Disetujui</th>{bendahara && <th />}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {disetujui.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap py-2">{tanggal(t.tanggal)}</td>
                    <td>{t.kategori} {t.reversal_of && <Badge warna="amber">koreksi</Badge>}</td>
                    <td className="text-slate-600">{t.keterangan}</td>
                    <td className={`whitespace-nowrap text-right font-medium ${t.tipe === 'masuk' ? 'text-emerald-700' : 'text-red-700'}`}>{t.tipe === 'masuk' ? '+' : '−'}{rupiah(t.nominal)}</td>
                    <td><Bukti path={t.bukti_path} /></td>
                    <td className="text-xs text-slate-500">{t.penyetuju?.nama}</td>
                    {bendahara && (
                      <td>
                        {!t.reversal_of && (
                          <details>
                            <summary className="cursor-pointer text-xs text-amber-700">Koreksi</summary>
                            <form action={koreksi} className="mt-1 flex gap-1">
                              <input type="hidden" name="id" value={t.id} />
                              <input type="hidden" name="wilayah_id" value={w} />
                              <Input name="alasan" required placeholder="Alasan" className="!w-32" />
                              <Submit varian="kedua">Ajukan</Submit>
                            </form>
                          </details>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function bulanBerikut(b: string) {
  const [y, m] = b.split('-').map(Number)
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
}

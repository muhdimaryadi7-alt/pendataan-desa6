import Link from 'next/link'
import { Card, Kosong, Stat } from '@/components/ui'
import { WILAYAH } from '@/lib/auth'
import { awalBulan, namaBulan, rupiah, tanggal, tanggalJam, urlBukti } from '@/lib/format'
import type { Laporan } from '@/lib/laporan'
import { supabaseSiap } from '@/lib/supabase/env'
import { createClient } from '@/lib/supabase/server'
import { CetakTombol } from './cetak'

export default async function LaporanPublik({ searchParams }: PageProps<'/'>) {
  const sp = await searchParams
  if (!supabaseSiap) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-xl font-bold">Aplikasi belum dikonfigurasi</h1>
        <p className="mt-2 text-sm text-slate-600">Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (lihat README).</p>
      </main>
    )
  }
  const n = Number(sp.w)
  const w = WILAYAH.some((x) => x.id === n) ? n : 2
  const bulan = awalBulan(sp.bulan)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('laporan_publik', { p_wilayah: w, p_bulan: bulan })
  const l = data as Laporan | null

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Laporan terbuka untuk warga</p>
          <h1 className="text-2xl font-bold">{l?.wilayah?.nama ?? 'RW 01'} · {namaBulan(bulan)}</h1>
          <p className="text-sm text-slate-500">Hanya transaksi yang sudah disetujui ketua yang tampil di sini.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <CetakTombol />
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-300">Masuk pengurus</Link>
        </div>
      </header>

      <nav className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        {[2, 3, 1].map((id) => (
          <Link
            key={id}
            href={`/?w=${id}&bulan=${bulan.slice(0, 7)}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${id === w ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}
          >
            {WILAYAH.find((x) => x.id === id)!.nama}
          </Link>
        ))}
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="w" value={w} />
          <input type="month" name="bulan" defaultValue={bulan.slice(0, 7)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <button className="rounded-lg bg-slate-800 px-3 text-sm font-semibold text-white">Lihat</button>
        </form>
      </nav>

      {error || !l ? (
        <Card><Kosong>Laporan belum tersedia. {error?.message}</Kosong></Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Saldo kas saat ini" nilai={rupiah(l.saldo)} warna="text-emerald-700" />
            <Stat label={`Pemasukan ${namaBulan(bulan)}`} nilai={rupiah(l.masuk_bulan)} />
            <Stat label={`Pengeluaran ${namaBulan(bulan)}`} nilai={rupiah(l.keluar_bulan)} />
          </div>

          <Card title="Rincian transaksi">
            {l.transaksi.length === 0 ? (
              <Kosong>Belum ada transaksi bulan ini.</Kosong>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-slate-500">
                    <tr><th className="py-2">Tanggal</th><th>Kategori</th><th>Keterangan</th><th className="text-right">Nominal</th><th className="print:hidden">Bukti</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {l.transaksi.map((t) => (
                      <tr key={t.id}>
                        <td className="whitespace-nowrap py-2">{tanggal(t.tanggal)}</td>
                        <td>{t.kategori}</td>
                        <td className="text-slate-600">{t.keterangan}</td>
                        <td className={`whitespace-nowrap text-right font-medium ${t.tipe === 'masuk' ? 'text-emerald-700' : 'text-red-700'}`}>
                          {t.tipe === 'masuk' ? '+' : '−'}{rupiah(t.nominal)}
                        </td>
                        <td className="print:hidden">
                          {t.bukti_path ? <a href={urlBukti(t.bukti_path)!} target="_blank" className="text-emerald-700 underline">lihat</a> : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {l.wilayah.tipe === 'rt' && (
              <Card title={`Iuran ${namaBulan(bulan)}`}>
                {l.iuran.total_kk === 0 ? (
                  <Kosong>Tagihan iuran bulan ini belum dibuat.</Kosong>
                ) : (
                  <>
                    <div className="mb-2 flex justify-between text-sm">
                      <span><b>{l.iuran.lunas}</b> dari {l.iuran.total_kk} KK sudah membayar</span>
                      <span className="text-slate-500">{rupiah(l.iuran.terkumpul)} / {rupiah(l.iuran.target)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.round((l.iuran.lunas / l.iuran.total_kk) * 100)}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Iuran berlaku untuk KK berstatus tetap; warga kontrak/kos tidak dikenai iuran.</p>
                  </>
                )}
              </Card>
            )}
            <Card title={`Statistik penduduk ${l.wilayah.tipe === 'rw' ? '(seluruh RT)' : ''}`}>
              <dl className="grid grid-cols-3 gap-y-3 text-center text-sm">
                {[
                  ['KK', l.penduduk.kk], ['Jiwa', l.penduduk.jiwa], ['L / P', `${l.penduduk.laki} / ${l.penduduk.perempuan}`],
                  ['Balita', l.penduduk.balita], ['Anak', l.penduduk.anak], ['Lansia', l.penduduk.lansia],
                ].map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="text-lg font-semibold">{v}</dd></div>
                ))}
              </dl>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Jadwal rapat">
              {l.rapat_mendatang.length === 0 ? <Kosong>Belum ada jadwal.</Kosong> : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {l.rapat_mendatang.map((r) => (
                    <li key={r.id} className="py-2">
                      <div className="font-medium">{r.judul}</div>
                      <div className="text-slate-500">{tanggalJam(r.mulai)}{r.lokasi && ` · ${r.lokasi}`}</div>
                      <a href={`/api/rapat/${r.id}/ics`} className="text-xs text-emerald-700 underline print:hidden">Tambah ke kalender</a>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Notulen & keputusan rapat">
              {l.notulen.length === 0 ? <Kosong>Belum ada notulen.</Kosong> : (
                <div className="space-y-3 text-sm">
                  {l.notulen.map((r) => (
                    <details key={r.id} className="rounded-lg bg-slate-50 p-3">
                      <summary className="cursor-pointer font-medium">{r.judul} · {tanggal(r.mulai)}</summary>
                      <div className="mt-2 whitespace-pre-line text-slate-700">{r.notulen}</div>
                      {r.keputusan && <div className="mt-2 whitespace-pre-line"><b>Keputusan:</b> {r.keputusan}</div>}
                      {r.jumlah_hadir != null && <div className="mt-1 text-xs text-slate-500">Hadir: {r.jumlah_hadir} orang</div>}
                    </details>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
      <footer className="mt-8 text-center text-xs text-slate-400">Data pribadi warga (NIK, No. KK, alamat) tidak ditampilkan di halaman ini.</footer>
    </main>
  )
}

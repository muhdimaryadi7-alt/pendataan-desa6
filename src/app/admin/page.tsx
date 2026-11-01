import Link from 'next/link'
import { Card, Stat } from '@/components/ui'
import { getProfil, isRW, WILAYAH } from '@/lib/auth'
import { namaBulan, rupiah, tanggalJam } from '@/lib/format'
import type { Laporan } from '@/lib/laporan'
import { createClient } from '@/lib/supabase/server'

export default async function Dashboard() {
  const profil = await getProfil()
  const supabase = await createClient()
  const daftar = isRW(profil) ? WILAYAH.map((w) => w.id) : [profil.wilayah_id]

  const laporan = await Promise.all(
    daftar.map(async (w) => (await supabase.rpc('laporan_publik', { p_wilayah: w })).data as Laporan),
  )
  const { count: menunggu } = await supabase
    .from('transaksi_kas')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'diajukan')
    .in('wilayah_id', daftar)
  const { data: rapat } = await supabase
    .from('rapat')
    .select('id, judul, mulai, lokasi, wilayah_id')
    .gte('mulai', new Date().toISOString())
    .in('wilayah_id', [...daftar, 1])
    .order('mulai')
    .limit(3)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-500">Ringkasan {laporan[0] && namaBulan(laporan[0].bulan)}</p>
      </div>

      {!!menunggu && (
        <Link href="/admin/kas" className="block rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <b>{menunggu} transaksi</b> menunggu persetujuan ketua →
        </Link>
      )}

      {laporan.filter(Boolean).map((l) => (
        <section key={l.wilayah.id} className="space-y-3">
          <h2 className="font-semibold text-slate-700">{l.wilayah.nama}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Saldo kas" nilai={rupiah(l.saldo)} warna="text-emerald-700" />
            <Stat label="Masuk / keluar bulan ini" nilai={rupiah(l.masuk_bulan)} sub={`Keluar ${rupiah(l.keluar_bulan)}`} />
            <Stat label="Penduduk" nilai={`${l.penduduk.jiwa} jiwa`} sub={`${l.penduduk.kk} KK · L ${l.penduduk.laki} / P ${l.penduduk.perempuan}`} />
            {l.wilayah.tipe === 'rt' ? (
              <Stat
                label="Iuran bulan ini"
                nilai={`${l.iuran.lunas}/${l.iuran.total_kk} KK lunas`}
                sub={`${rupiah(l.iuran.terkumpul)} dari ${rupiah(l.iuran.target)}`}
                warna={l.iuran.total_kk && l.iuran.lunas < l.iuran.total_kk ? 'text-amber-700' : 'text-slate-900'}
              />
            ) : (
              <Stat label="Lansia / balita" nilai={`${l.penduduk.lansia} / ${l.penduduk.balita}`} sub="seluruh RT" />
            )}
          </div>
        </section>
      ))}

      <Card title="Rapat terdekat" aksi={<Link href="/admin/rapat" className="text-sm text-emerald-700">Semua →</Link>}>
        {rapat?.length ? (
          <ul className="divide-y divide-slate-100">
            {rapat.map((r) => (
              <li key={r.id} className="py-2 text-sm">
                <div className="font-medium">{r.judul}</div>
                <div className="text-slate-500">{tanggalJam(r.mulai)}{r.lokasi && ` · ${r.lokasi}`}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Belum ada jadwal rapat.</p>
        )}
      </Card>
    </div>
  )
}

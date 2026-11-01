import { Badge, Card, Field, Input, Kosong, Pesan, PilihWilayah, Stat } from '@/components/ui'
import { Submit } from '@/components/submit'
import { boleh, getProfil, isRW, pilihWilayah, WILAYAH } from '@/lib/auth'
import { awalBulan, namaBulan, rupiah } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { aturNominal, batalBayar, bayar, buatTagihan, bukukan } from './actions'

type Tagihan = {
  id: string; periode: string; nominal: number; terbayar: number
  kartu_keluarga: { no_kk: string; alamat: string; penduduk: { nama: string; hubungan: string }[] } | null
  pembayaran_iuran: { metode: string; transaksi_id: string | null }[]
}

const kepala = (t: Tagihan) =>
  t.kartu_keluarga?.penduduk.find((p) => p.hubungan === 'Kepala Keluarga')?.nama ?? t.kartu_keluarga?.penduduk[0]?.nama ?? '-'

export default async function IuranPage({ searchParams }: PageProps<'/admin/iuran'>) {
  const sp = await searchParams
  const profil = await getProfil()
  const w = pilihWilayah(profil, sp.w, false)
  const bulan = awalBulan(sp.bulan)
  const bln = bulan.slice(0, 7)
  const supabase = await createClient()

  const [{ data: atur }, { data: tagihan }, { data: tunggak }, { data: belumBuku }] = await Promise.all([
    supabase.from('pengaturan_wilayah').select('iuran_bulanan').eq('wilayah_id', w).single(),
    supabase
      .from('tagihan_iuran')
      .select('id, periode, nominal, terbayar, kartu_keluarga(no_kk, alamat, penduduk(nama, hubungan)), pembayaran_iuran(metode, transaksi_id)')
      .eq('wilayah_id', w)
      .eq('periode', bulan),
    supabase
      .from('tagihan_iuran')
      .select('id, periode, nominal, terbayar, kartu_keluarga(no_kk, alamat, penduduk(nama, hubungan)), pembayaran_iuran(metode, transaksi_id)')
      .eq('wilayah_id', w)
      .lt('periode', bulan)
      .order('periode'),
    supabase.from('pembayaran_iuran').select('nominal').eq('wilayah_id', w).is('transaksi_id', null),
  ])
  const daftar = ((tagihan ?? []) as unknown as Tagihan[]).sort((a, b) => (a.kartu_keluarga?.alamat ?? '').localeCompare(b.kartu_keluarga?.alamat ?? ''))
  const tunggakan = ((tunggak ?? []) as unknown as Tagihan[]).filter((t) => t.terbayar < t.nominal)
  const lunas = daftar.filter((t) => t.terbayar >= t.nominal).length
  const terkumpul = daftar.reduce((s, t) => s + Number(t.terbayar), 0)
  const totalBelumBuku = (belumBuku ?? []).reduce((s, p) => s + Number(p.nominal), 0)

  const kelola = boleh(profil, w, 'bendahara_rt', 'ketua_rt')
  const bendahara = boleh(profil, w, 'bendahara_rt')
  const ketua = boleh(profil, w, 'ketua_rt')
  const hidden = (
    <>
      <input type="hidden" name="wilayah_id" value={w} />
      <input type="hidden" name="bulan" value={bln} />
    </>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Iuran Bulanan</h1>
          <p className="text-sm text-slate-500">{namaBulan(bulan)} · ditarik saat rapat rutin · hanya KK berstatus tetap</p>
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="w" value={w} />
          <Input type="month" name="bulan" defaultValue={bln} className="!w-auto" />
          <button className="rounded-lg bg-slate-800 px-3 text-sm font-semibold text-white">Lihat</button>
        </form>
      </div>
      <PilihWilayah path="/admin/iuran" aktif={w} opsi={isRW(profil) ? WILAYAH.filter((x) => x.tipe === 'rt') : []} />
      <Pesan sp={sp} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Nominal / KK" nilai={rupiah(atur?.iuran_bulanan)} />
        <Stat label="KK lunas" nilai={`${lunas} / ${daftar.length}`} warna={lunas < daftar.length ? 'text-amber-700' : 'text-emerald-700'} />
        <Stat label="Terkumpul" nilai={rupiah(terkumpul)} />
        <Stat label="Belum dibukukan ke kas" nilai={rupiah(totalBelumBuku)} warna={totalBelumBuku ? 'text-amber-700' : 'text-slate-900'} />
      </div>

      {(ketua || bendahara) && (
        <div className="flex flex-wrap gap-3">
          {ketua && (
            <form action={aturNominal} className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
              {hidden}
              <Field label="Nominal iuran (Rp)"><Input name="nominal" inputMode="numeric" defaultValue={atur?.iuran_bulanan ?? ''} className="!w-36" /></Field>
              <Submit varian="kedua">Simpan</Submit>
            </form>
          )}
          {kelola && (
            <form action={buatTagihan} className="flex items-end rounded-xl border border-slate-200 bg-white p-3">
              {hidden}
              <Submit>Buat tagihan {namaBulan(bulan)}</Submit>
            </form>
          )}
          {bendahara && totalBelumBuku > 0 && (
            <form action={bukukan} className="flex items-end rounded-xl border border-amber-200 bg-amber-50 p-3">
              {hidden}
              <Submit konfirmasi={`Bukukan ${rupiah(totalBelumBuku)} ke kas sebagai satu transaksi?`}>Bukukan {rupiah(totalBelumBuku)} ke kas</Submit>
            </form>
          )}
        </div>
      )}

      <Card title="Daftar tagihan (centang saat warga membayar)">
        {daftar.length === 0 ? (
          <Kosong>Belum ada tagihan bulan ini. {kelola && 'Klik "Buat tagihan" di atas.'}</Kosong>
        ) : (
          <div className="divide-y divide-slate-100">
            {daftar.map((t) => <BarisTagihan key={t.id} t={t} kelola={kelola} hidden={hidden} />)}
          </div>
        )}
      </Card>

      {tunggakan.length > 0 && (
        <Card title={`Tunggakan bulan sebelumnya (${tunggakan.length})`}>
          <div className="divide-y divide-slate-100">
            {tunggakan.map((t) => <BarisTagihan key={t.id} t={t} kelola={kelola} hidden={hidden} tampilBulan />)}
          </div>
        </Card>
      )}
    </div>
  )
}

function BarisTagihan({ t, kelola, hidden, tampilBulan }: { t: Tagihan; kelola: boolean; hidden: React.ReactNode; tampilBulan?: boolean }) {
  const lunas = t.terbayar >= t.nominal
  const bisaBatal = t.pembayaran_iuran.some((p) => !p.transaksi_id)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
      <div>
        <div className="font-medium">{kepala(t)}</div>
        <div className="text-xs text-slate-500">
          {t.kartu_keluarga?.alamat}
          {tampilBulan && ` · ${namaBulan(t.periode)}`} · {rupiah(t.nominal)}
          {t.terbayar > 0 && !lunas && ` · terbayar ${rupiah(t.terbayar)}`}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {lunas ? <Badge warna="green">Lunas · {t.pembayaran_iuran.at(-1)?.metode}</Badge> : <Badge warna="amber">Belum</Badge>}
        {kelola && !lunas && (
          <>
            <form action={bayar}>{hidden}<input type="hidden" name="id" value={t.id} /><input type="hidden" name="metode" value="tunai" /><Submit className="!px-3 !py-1.5">Tunai</Submit></form>
            <form action={bayar}>{hidden}<input type="hidden" name="id" value={t.id} /><input type="hidden" name="metode" value="transfer" /><Submit varian="kedua" className="!px-3 !py-1.5">Transfer</Submit></form>
          </>
        )}
        {kelola && bisaBatal && (
          <form action={batalBayar}>{hidden}<input type="hidden" name="id" value={t.id} /><Submit varian="kedua" className="!px-2 !py-1 text-xs" konfirmasi="Batalkan pembayaran ini?">Batal</Submit></form>
        )}
      </div>
    </div>
  )
}

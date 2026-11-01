import { Badge, Card, Kosong } from '@/components/ui'
import { getProfil, namaWilayah } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

type Log = {
  id: number; waktu: string; user_id: string | null; tabel: string; aksi: string; wilayah_id: number | null
  data_lama: Record<string, unknown> | null; data_baru: Record<string, unknown> | null
}

const NAMA_TABEL: Record<string, string> = {
  kartu_keluarga: 'Kartu Keluarga', penduduk: 'Penduduk', mutasi_penduduk: 'Mutasi', transaksi_kas: 'Kas',
  tagihan_iuran: 'Tagihan iuran', pembayaran_iuran: 'Pembayaran iuran', rapat: 'Rapat', profiles: 'Pengguna', pengaturan_wilayah: 'Pengaturan',
}
const SEMBUNYI = new Set(['id', 'created_at', 'wilayah_id', 'kk_id', 'dibuat_oleh', 'tagihan_id', 'penduduk_id'])

// Ringkas perubahan: kolom yang berubah, atau isi utama baris baru/terhapus
function ringkas(l: Log) {
  const lama = l.data_lama ?? {}, baru = l.data_baru ?? {}
  if (l.aksi === 'UPDATE') {
    return Object.keys(baru)
      .filter((k) => !SEMBUNYI.has(k) && JSON.stringify(lama[k]) !== JSON.stringify(baru[k]))
      .map((k) => `${k}: ${String(lama[k] ?? '∅')} → ${String(baru[k] ?? '∅')}`)
      .join(' · ')
  }
  const r = l.aksi === 'DELETE' ? lama : baru
  return ['nama', 'no_kk', 'judul', 'kategori', 'nominal', 'jenis', 'status', 'periode']
    .filter((k) => r[k] != null)
    .map((k) => `${k}: ${String(r[k])}`)
    .join(' · ')
}

export default async function AuditPage() {
  await getProfil()
  const supabase = await createClient()
  const [{ data }, { data: orang }] = await Promise.all([
    supabase.from('audit_log').select('*').order('waktu', { ascending: false }).limit(200),
    supabase.from('profiles').select('id, nama'),
  ])
  const logs = (data ?? []) as Log[]
  const nama = (id: string | null) => orang?.find((o) => o.id === id)?.nama ?? (id ? 'pengguna lain' : 'sistem')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Audit Log</h1>
        <p className="text-sm text-slate-500">200 perubahan terakhir — tercatat otomatis dan tidak bisa diubah.</p>
      </div>
      <Card>
        {logs.length === 0 ? (
          <Kosong>Belum ada aktivitas.</Kosong>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {logs.map((l) => (
              <li key={l.id} className="py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge warna={l.aksi === 'INSERT' ? 'green' : l.aksi === 'DELETE' ? 'red' : 'amber'}>
                    {l.aksi === 'INSERT' ? 'tambah' : l.aksi === 'DELETE' ? 'hapus' : 'ubah'}
                  </Badge>
                  <b>{NAMA_TABEL[l.tabel] ?? l.tabel}</b>
                  <span className="text-slate-500">
                    oleh {nama(l.user_id)} · {l.wilayah_id ? namaWilayah(l.wilayah_id) : ''} ·{' '}
                    {new Date(l.waktu).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                  </span>
                </div>
                <div className="mt-0.5 break-all text-xs text-slate-600">{ringkas(l)}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

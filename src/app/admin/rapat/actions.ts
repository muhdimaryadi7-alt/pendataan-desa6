'use server'
import { kembali, teks } from '@/lib/aksi'
import { createClient } from '@/lib/supabase/server'

// Tanggal pada "minggu ke-n, hari yang sama" di bulan berikutnya (mis. Minggu pertama tiap bulan)
function polaBulanan(awal: string, jumlah: number) {
  const [y, m, d] = awal.split('-').map(Number)
  const hari = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  const ke = Math.ceil(d / 7)
  const hasil: string[] = []
  for (let i = 0; i < jumlah; i++) {
    const tahun = y + Math.floor((m - 1 + i) / 12)
    const bulan = (m - 1 + i) % 12
    const pertama = new Date(Date.UTC(tahun, bulan, 1)).getUTCDay()
    let tgl = 1 + ((hari - pertama + 7) % 7) + (ke - 1) * 7
    const akhir = new Date(Date.UTC(tahun, bulan + 1, 0)).getUTCDate()
    if (tgl > akhir) tgl -= 7
    hasil.push(`${tahun}-${String(bulan + 1).padStart(2, '0')}-${String(tgl).padStart(2, '0')}`)
  }
  return hasil
}

export async function buatRapat(f: FormData) {
  const supabase = await createClient()
  const w = Number(f.get('wilayah_id'))
  const tgl = teks(f, 'tanggal')!
  const jam = teks(f, 'jam') ?? '19:30'
  const ulang = Math.min(Math.max(Number(f.get('ulang') ?? 1), 1), 12)
  const baris = polaBulanan(tgl, ulang).map((d) => ({
    wilayah_id: w,
    judul: teks(f, 'judul')!,
    mulai: `${d}T${jam}:00+07:00`,
    lokasi: teks(f, 'lokasi'),
    agenda: teks(f, 'agenda'),
  }))
  const { error } = await supabase.from('rapat').insert(baris)
  kembali(`/admin/rapat?w=${w}`, error ? { galat: error.message.includes('row-level') ? 'Anda tidak berhak membuat jadwal di wilayah ini.' : error.message } : { pesan: `${baris.length} jadwal rapat dibuat.` })
}

export async function simpanNotulen(f: FormData) {
  const supabase = await createClient()
  const id = teks(f, 'id')!
  const hadir = teks(f, 'jumlah_hadir')
  const { error } = await supabase
    .from('rapat')
    .update({
      judul: teks(f, 'judul') ?? undefined,
      lokasi: teks(f, 'lokasi'),
      agenda: teks(f, 'agenda'),
      notulen: teks(f, 'notulen'),
      keputusan: teks(f, 'keputusan'),
      jumlah_hadir: hadir ? Number(hadir) : null,
    })
    .eq('id', id)
  kembali(`/admin/rapat/${id}`, error ? { galat: error.message } : { pesan: 'Rapat disimpan.' })
}

export async function hapusRapat(f: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('rapat').delete().eq('id', teks(f, 'id')!)
  kembali(`/admin/rapat?w=${teks(f, 'wilayah_id')}`, error ? { galat: error.message } : { pesan: 'Jadwal dihapus.' })
}

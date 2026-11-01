'use server'
import { kembali, teks } from '@/lib/aksi'
import { createClient } from '@/lib/supabase/server'

const WAJIB_BUKTI = 100_000

export async function tambahTransaksi(f: FormData) {
  const supabase = await createClient()
  const w = Number(f.get('wilayah_id'))
  const asal = `/admin/kas?w=${w}`
  const [jenis, kategori] = (teks(f, 'kategori') ?? 'keluar|Lainnya').split('|')
  const tipe = jenis === 'masuk' ? 'masuk' : 'keluar'
  const nominal = Number(String(f.get('nominal') ?? '').replace(/\D/g, ''))
  const bukti = f.get('bukti')
  const adaBukti = bukti instanceof File && bukti.size > 0

  if (!nominal) kembali(asal, { galat: 'Nominal wajib diisi.' })
  if (tipe === 'keluar' && nominal >= WAJIB_BUKTI && !adaBukti) {
    kembali(asal, { galat: 'Pengeluaran Rp100.000 ke atas wajib melampirkan foto nota/bukti.' })
  }

  let bukti_path: string | null = null
  if (adaBukti) {
    const ext = bukti.type === 'application/pdf' ? 'pdf' : 'jpg'
    bukti_path = `${w}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('bukti').upload(bukti_path, bukti, { contentType: bukti.type })
    if (error) kembali(asal, { galat: `Gagal mengunggah bukti: ${error.message}` })
  }

  const { error } = await supabase.from('transaksi_kas').insert({
    wilayah_id: w,
    tanggal: teks(f, 'tanggal') ?? undefined,
    tipe,
    kategori: kategori || 'Lainnya',
    nominal,
    keterangan: teks(f, 'keterangan'),
    bukti_path,
  })
  kembali(asal, error ? { galat: error.message.includes('row-level') ? 'Hanya bendahara yang dapat mencatat transaksi.' : error.message } : { pesan: 'Transaksi diajukan, menunggu persetujuan ketua.' })
}

export async function putuskan(f: FormData) {
  const supabase = await createClient()
  const w = teks(f, 'wilayah_id')
  const setuju = f.get('setuju') === '1'
  const { error } = await supabase.rpc('setujui_transaksi', { p_id: teks(f, 'id'), p_setuju: setuju, p_alasan: teks(f, 'alasan') })
  kembali(`/admin/kas?w=${w}`, error ? { galat: error.message } : { pesan: setuju ? 'Transaksi disetujui dan masuk laporan publik.' : 'Transaksi ditolak.' })
}

export async function ajukanUlang(f: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('transaksi_kas').update({ status: 'diajukan', alasan_tolak: null }).eq('id', teks(f, 'id')!)
  kembali(`/admin/kas?w=${teks(f, 'wilayah_id')}`, error ? { galat: error.message } : { pesan: 'Transaksi diajukan ulang.' })
}

export async function hapusTransaksi(f: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('transaksi_kas').delete().eq('id', teks(f, 'id')!)
  kembali(`/admin/kas?w=${teks(f, 'wilayah_id')}`, error ? { galat: error.message } : { pesan: 'Pengajuan dihapus.' })
}

export async function koreksi(f: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('koreksi_transaksi', { p_id: teks(f, 'id'), p_alasan: teks(f, 'alasan') })
  kembali(`/admin/kas?w=${teks(f, 'wilayah_id')}`, error ? { galat: error.message } : { pesan: 'Transaksi koreksi diajukan, menunggu persetujuan ketua.' })
}

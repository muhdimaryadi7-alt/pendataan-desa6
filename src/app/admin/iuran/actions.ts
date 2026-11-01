'use server'
import { kembali, teks } from '@/lib/aksi'
import { createClient } from '@/lib/supabase/server'

const asal = (f: FormData) => `/admin/iuran?w=${teks(f, 'wilayah_id')}&bulan=${teks(f, 'bulan') ?? ''}`

export async function aturNominal(f: FormData) {
  const supabase = await createClient()
  const nominal = Number(String(f.get('nominal') ?? '').replace(/\D/g, ''))
  const { data, error } = await supabase
    .from('pengaturan_wilayah')
    .update({ iuran_bulanan: nominal })
    .eq('wilayah_id', Number(f.get('wilayah_id')))
    .select('wilayah_id')
  kembali(asal(f), error || !data?.length ? { galat: 'Hanya ketua yang dapat mengubah nominal iuran.' } : { pesan: 'Nominal iuran disimpan.' })
}

export async function buatTagihan(f: FormData) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('buat_tagihan', { p_wilayah: Number(f.get('wilayah_id')), p_periode: `${teks(f, 'bulan')}-01` })
  kembali(asal(f), error ? { galat: error.message } : { pesan: data ? `${data} tagihan dibuat untuk KK berstatus tetap.` : 'Semua KK tetap sudah punya tagihan bulan ini.' })
}

export async function bayar(f: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('bayar_iuran', { p_tagihan: teks(f, 'id'), p_metode: teks(f, 'metode') ?? 'tunai' })
  kembali(asal(f), error ? { galat: error.message } : {})
}

export async function batalBayar(f: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('batal_bayar', { p_tagihan: teks(f, 'id') })
  kembali(asal(f), error ? { galat: error.message } : { pesan: 'Pembayaran dibatalkan.' })
}

export async function bukukan(f: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('bukukan_iuran', { p_wilayah: Number(f.get('wilayah_id')) })
  kembali(asal(f), error ? { galat: error.message } : { pesan: 'Iuran dibukukan ke kas, menunggu persetujuan Ketua RT.' })
}

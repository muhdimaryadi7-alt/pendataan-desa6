const rp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
export const rupiah = (n: number | string | null | undefined) => rp.format(Number(n ?? 0))

export const tanggal = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-'

export const tanggalJam = (d: string | Date) =>
  new Date(d).toLocaleString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  })

export const namaBulan = (d: string | Date) =>
  new Date(d).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })

// 'YYYY-MM' → tanggal 1 bulan itu
export function awalBulan(bulan?: string | string[]) {
  const s = Array.isArray(bulan) ? bulan[0] : bulan
  if (s && /^\d{4}-\d{2}$/.test(s)) return `${s}-01`
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

export const umur = (tgl: string | null) => {
  if (!tgl) return null
  const l = new Date(tgl), n = new Date()
  let u = n.getFullYear() - l.getFullYear()
  if (n.getMonth() < l.getMonth() || (n.getMonth() === l.getMonth() && n.getDate() < l.getDate())) u--
  return u
}

export const urlBukti = (path: string | null) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bukti/${path}` : null

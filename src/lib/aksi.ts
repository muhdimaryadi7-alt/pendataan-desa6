import 'server-only'
import { redirect } from 'next/navigation'

// Kembali ke halaman asal dengan pesan sukses / galat
export function kembali(path: string, hasil: { pesan?: string; galat?: string }): never {
  const url = new URL(path, 'http://x')
  if (hasil.pesan) url.searchParams.set('pesan', hasil.pesan)
  if (hasil.galat) url.searchParams.set('galat', hasil.galat)
  redirect(url.pathname + url.search)
}

export const teks = (f: FormData, k: string) => {
  const v = f.get(k)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

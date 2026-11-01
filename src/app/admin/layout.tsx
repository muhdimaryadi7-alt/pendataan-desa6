import Link from 'next/link'
import { getProfil, NAMA_PERAN, namaWilayah } from '@/lib/auth'
import { keluar } from '../login/actions'
import { Nav } from './nav'

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const profil = await getProfil()
  const menu = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/penduduk', label: 'Penduduk' },
    { href: '/admin/kas', label: 'Kas' },
    { href: '/admin/iuran', label: 'Iuran' },
    { href: '/admin/rapat', label: 'Rapat' },
  ]
  if (['super_admin', 'ketua_rw', 'ketua_rt'].includes(profil.peran)) menu.push({ href: '/admin/audit', label: 'Audit Log' })
  if (['super_admin', 'ketua_rw'].includes(profil.peran)) menu.push({ href: '/admin/pengguna', label: 'Pengguna' })

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="font-bold text-emerald-800">Pendataan RW 01</Link>
          <div className="flex items-center gap-3 text-right">
            <div className="text-xs leading-tight">
              <div className="font-semibold text-slate-800">{profil.nama}</div>
              <div className="text-slate-500">{NAMA_PERAN[profil.peran]} · {namaWilayah(profil.wilayah_id)}</div>
            </div>
            <form action={keluar}>
              <button className="rounded-lg px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">Keluar</button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-2">
          <Nav menu={menu} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}

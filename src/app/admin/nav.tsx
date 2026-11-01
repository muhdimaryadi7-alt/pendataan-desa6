'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Nav({ menu }: { menu: { href: string; label: string }[] }) {
  const path = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {menu.map((m) => {
        const aktif = m.href === '/admin' ? path === '/admin' : path.startsWith(m.href)
        return (
          <Link
            key={m.href}
            href={m.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${aktif ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {m.label}
          </Link>
        )
      })}
    </nav>
  )
}

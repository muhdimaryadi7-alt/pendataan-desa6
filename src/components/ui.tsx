import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

export function Card({ title, aksi, children, className = '' }: { title?: ReactNode; aksi?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {(title || aksi) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-slate-800">{title}</h2>}
          {aksi}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, nilai, sub, warna = 'text-slate-900' }: { label: string; nilai: ReactNode; sub?: ReactNode; warna?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${warna}`}>{nilai}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

const kontrol = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

export const Input = (p: ComponentProps<'input'>) => <input {...p} className={`${kontrol} ${p.className ?? ''}`} />
export const Textarea = (p: ComponentProps<'textarea'>) => <textarea rows={3} {...p} className={`${kontrol} ${p.className ?? ''}`} />
export const Select = (p: ComponentProps<'select'>) => <select {...p} className={`${kontrol} ${p.className ?? ''}`} />

export function Badge({ children, warna = 'slate' }: { children: ReactNode; warna?: 'slate' | 'green' | 'amber' | 'red' | 'blue' }) {
  const w = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-sky-100 text-sky-800',
  }[warna]
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${w}`}>{children}</span>
}

export function Pesan({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const ok = typeof sp.pesan === 'string' ? sp.pesan : null
  const galat = typeof sp.galat === 'string' ? sp.galat : null
  if (!ok && !galat) return null
  return (
    <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${galat ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>
      {galat ?? ok}
    </div>
  )
}

// Tab pemilih wilayah untuk pengurus RW
export function PilihWilayah({ path, aktif, opsi }: { path: string; aktif: number; opsi: { id: number; nama: string }[] }) {
  if (opsi.length < 2) return null
  return (
    <div className="mb-4 flex gap-2">
      {opsi.map((w) => (
        <Link
          key={w.id}
          href={`${path}?w=${w.id}`}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${w.id === aktif ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}
        >
          {w.nama}
        </Link>
      ))}
    </div>
  )
}

export function Kosong({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-500">{children}</p>
}

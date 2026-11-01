'use client'
import { useFormStatus } from 'react-dom'
import type { ReactNode } from 'react'

const gaya = {
  utama: 'bg-emerald-700 text-white hover:bg-emerald-800',
  kedua: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50',
  bahaya: 'bg-red-600 text-white hover:bg-red-700',
}

export function Submit({ children, varian = 'utama', konfirmasi, className = '' }: {
  children: ReactNode
  varian?: keyof typeof gaya
  konfirmasi?: string
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (konfirmasi && !confirm(konfirmasi)) e.preventDefault()
      }}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${gaya[varian]} ${className}`}
    >
      {pending ? 'Menyimpan…' : children}
    </button>
  )
}

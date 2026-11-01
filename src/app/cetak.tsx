'use client'

export function CetakTombol() {
  return (
    <button onClick={() => window.print()} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">
      Cetak / PDF
    </button>
  )
}

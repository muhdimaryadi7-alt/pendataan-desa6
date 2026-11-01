'use client'
import { useState } from 'react'

const MAKS_SISI = 1600

// Input foto nota: gambar dikecilkan & dikompres di browser (± <500 KB) sebelum dikirim
export function InputBukti({ wajibInfo }: { wajibInfo?: string }) {
  const [info, setInfo] = useState<string | null>(null)

  async function kompres(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const file = input.files?.[0]
    if (!file || !file.type.startsWith('image/')) return setInfo(file ? `${file.name}` : null)
    try {
      const bmp = await createImageBitmap(file)
      const skala = Math.min(1, MAKS_SISI / Math.max(bmp.width, bmp.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bmp.width * skala)
      canvas.height = Math.round(bmp.height * skala)
      canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.7))
      if (!blob) return
      const kecil = new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
      const dt = new DataTransfer()
      dt.items.add(kecil)
      input.files = dt.files
      setInfo(`${Math.round(file.size / 1024)} KB → ${Math.round(kecil.size / 1024)} KB`)
    } catch {
      setInfo(file.name)
    }
  }

  return (
    <div>
      <input
        type="file"
        name="bukti"
        accept="image/*,application/pdf"
        onChange={kompres}
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-800"
      />
      <p className="mt-1 text-xs text-slate-500">{info ?? wajibInfo}</p>
    </div>
  )
}

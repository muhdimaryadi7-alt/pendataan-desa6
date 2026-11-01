import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, Field, Input, Pesan, Textarea } from '@/components/ui'
import { Submit } from '@/components/submit'
import { boleh, getProfil, namaWilayah } from '@/lib/auth'
import { tanggalJam } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { hapusRapat, simpanNotulen } from '../actions'

export default async function DetailRapat({ params, searchParams }: PageProps<'/admin/rapat/[id]'>) {
  const { id } = await params
  const sp = await searchParams
  const profil = await getProfil()
  const supabase = await createClient()
  const { data: r } = await supabase.from('rapat').select('*').eq('id', id).single()
  if (!r) notFound()
  const bisaTulis = boleh(profil, r.wilayah_id, 'ketua_rt', 'sekretaris_rt', 'ketua_rw')

  const teksWA = `*${r.judul}* (${namaWilayah(r.wilayah_id)})\n🗓 ${tanggalJam(r.mulai)}\n📍 ${r.lokasi ?? '-'}${r.agenda ? `\n\nAgenda:\n${r.agenda}` : ''}`

  return (
    <div className="space-y-4">
      <Link href={`/admin/rapat?w=${r.wilayah_id}`} className="text-sm text-emerald-700">← Kalender rapat</Link>
      <Pesan sp={sp} />
      <Card title={r.judul}>
        <p className="text-sm text-slate-600">{tanggalJam(r.mulai)} · {r.lokasi ?? 'lokasi belum diisi'} · {namaWilayah(r.wilayah_id)}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <a href={`https://wa.me/?text=${encodeURIComponent(teksWA)}`} target="_blank" className="rounded-lg bg-green-600 px-3 py-1.5 font-semibold text-white">Bagikan ke WhatsApp</a>
          <a href={`/api/rapat/${r.id}/ics`} className="rounded-lg px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-300">Tambah ke kalender (.ics)</a>
        </div>
      </Card>

      {bisaTulis ? (
        <Card title="Agenda & notulen">
          <form action={simpanNotulen} className="space-y-3">
            <input type="hidden" name="id" value={r.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Judul"><Input name="judul" defaultValue={r.judul} required /></Field>
              <Field label="Lokasi"><Input name="lokasi" defaultValue={r.lokasi ?? ''} /></Field>
            </div>
            <Field label="Agenda"><Textarea name="agenda" defaultValue={r.agenda ?? ''} /></Field>
            <Field label="Notulen (tampil di halaman publik)"><Textarea name="notulen" rows={6} defaultValue={r.notulen ?? ''} /></Field>
            <Field label="Keputusan rapat"><Textarea name="keputusan" defaultValue={r.keputusan ?? ''} placeholder="Mis. disepakati beli 2 tong sampah, maks Rp300.000" /></Field>
            <Field label="Jumlah hadir"><Input name="jumlah_hadir" type="number" min={0} defaultValue={r.jumlah_hadir ?? ''} className="!w-32" /></Field>
            <Submit>Simpan</Submit>
          </form>
          <form action={hapusRapat} className="mt-4 border-t border-slate-100 pt-4">
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="wilayah_id" value={r.wilayah_id} />
            <Submit varian="bahaya" konfirmasi="Hapus jadwal rapat ini?">Hapus jadwal</Submit>
          </form>
        </Card>
      ) : (
        <Card title="Agenda & notulen">
          <div className="space-y-3 whitespace-pre-line text-sm">
            <div><b>Agenda</b><br />{r.agenda ?? '-'}</div>
            <div><b>Notulen</b><br />{r.notulen ?? '-'}</div>
            <div><b>Keputusan</b><br />{r.keputusan ?? '-'}</div>
          </div>
        </Card>
      )}
    </div>
  )
}

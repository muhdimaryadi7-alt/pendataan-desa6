import { createClient } from '@/lib/supabase/server'

const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`)

// File kalender (.ics) agar jadwal rapat bisa ditambahkan ke Google Calendar / kalender HP
export async function GET(_req: Request, ctx: RouteContext<'/api/rapat/[id]/ics'>) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: r } = await supabase.from('rapat').select('id, judul, mulai, lokasi, agenda').eq('id', id).single()
  if (!r) return new Response('Tidak ditemukan', { status: 404 })

  const mulai = new Date(r.mulai)
  const selesai = new Date(mulai.getTime() + 2 * 60 * 60 * 1000)
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pendataan RW 01//ID',
    'BEGIN:VEVENT',
    `UID:${r.id}@pendataan-rw`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(mulai)}`,
    `DTEND:${fmt(selesai)}`,
    `SUMMARY:${esc(r.judul)}`,
    r.lokasi ? `LOCATION:${esc(r.lokasi)}` : '',
    r.agenda ? `DESCRIPTION:${esc(r.agenda)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')

  return new Response(ics, {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="rapat.ics"' },
  })
}

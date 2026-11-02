import { redirect } from 'next/navigation'
import { Badge, Card, Field, Input, Kosong, Pesan, Select } from '@/components/ui'
import { Submit } from '@/components/submit'
import { getProfil, NAMA_PERAN, namaWilayah, type Peran } from '@/lib/auth'
import { tanggal } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_URL } from '@/lib/supabase/env'
import { nonaktifkan, tetapkanPeran } from './actions'

type Pengurus = { id: string; nama: string; peran: Peran; wilayah_id: number; aktif: boolean }

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1]

function IsianPeran({ peranTersedia, p }: { peranTersedia: Peran[]; p?: Pengurus }) {
  return (
    <>
      <Field label="Nama"><Input name="nama" required defaultValue={p?.nama} /></Field>
      <Field label="Peran">
        <Select name="peran" defaultValue={p?.peran ?? 'ketua_rt'}>
          {peranTersedia.map((x) => <option key={x} value={x}>{NAMA_PERAN[x]}</option>)}
        </Select>
      </Field>
      <Field label="RT (khusus pengurus RT)">
        <Select name="wilayah_id" defaultValue={p && p.wilayah_id !== 1 ? p.wilayah_id : 2}>
          <option value="2">RT 01</option>
          <option value="3">RT 02</option>
        </Select>
      </Field>
    </>
  )
}

export default async function PenggunaPage({ searchParams }: PageProps<'/admin/pengguna'>) {
  const sp = await searchParams
  const profil = await getProfil()
  if (!['super_admin', 'ketua_rw'].includes(profil.peran)) redirect('/admin')
  const supabase = await createClient()
  const [{ data: pengurus }, { data: baru, error }] = await Promise.all([
    supabase.from('profiles').select('id, nama, peran, wilayah_id, aktif').order('aktif', { ascending: false }).order('wilayah_id').order('peran'),
    supabase.rpc('akun_belum_terdaftar'),
  ])
  const peranTersedia = (Object.keys(NAMA_PERAN) as Peran[]).filter((p) => p !== 'super_admin' || profil.peran === 'super_admin')
  const bisaUbah = (p: Pengurus) => p.id !== profil.id && (p.peran !== 'super_admin' || profil.peran === 'super_admin')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Pengguna (Pengurus)</h1>
      <Pesan sp={sp} />
      {error && <Pesan sp={{ galat: `Fungsi pengguna belum terpasang di database: ${error.message}` }} />}

      <Card title="Cara menambah pengurus">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>
            Buat akun login di{' '}
            <a
              href={projectRef ? `https://supabase.com/dashboard/project/${projectRef}/auth/users` : 'https://supabase.com/dashboard'}
              target="_blank"
              className="text-emerald-700 underline"
            >
              Supabase → Authentication → Users
            </a>{' '}
            → <b>Add user</b> → <b>Create new user</b> (centang <i>Auto confirm user</i>).
          </li>
          <li>Muat ulang halaman ini. Akun baru muncul di bagian <b>Menunggu penetapan peran</b>.</li>
          <li>Isi nama, pilih peran & RT, lalu klik <b>Tetapkan</b>. Berikan email & password kepada yang bersangkutan.</li>
        </ol>
      </Card>

      <Card title={`Menunggu penetapan peran (${baru?.length ?? 0})`}>
        {!baru?.length ? (
          <Kosong>Tidak ada akun baru.</Kosong>
        ) : (
          <div className="divide-y divide-slate-100">
            {(baru as { id: string; email: string; dibuat: string }[]).map((a) => (
              <form key={a.id} action={tetapkanPeran} className="grid gap-3 py-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
                <input type="hidden" name="id" value={a.id} />
                <div className="text-sm">
                  <div className="font-medium">{a.email}</div>
                  <div className="text-xs text-slate-500">dibuat {tanggal(a.dibuat)}</div>
                </div>
                <IsianPeran peranTersedia={peranTersedia} />
                <Submit>Tetapkan</Submit>
              </form>
            ))}
          </div>
        )}
      </Card>

      <Card title="Daftar pengurus">
        <ul className="divide-y divide-slate-100 text-sm">
          {((pengurus ?? []) as Pengurus[]).map((p) => (
            <li key={p.id} className="py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {p.nama} {!p.aktif && <Badge warna="red">nonaktif</Badge>} {p.id === profil.id && <Badge>Anda</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">{NAMA_PERAN[p.peran]} · {namaWilayah(p.wilayah_id)}</div>
                </div>
                {bisaUbah(p) && p.aktif && (
                  <form action={nonaktifkan}>
                    <input type="hidden" name="id" value={p.id} />
                    <Submit varian="kedua" className="!px-2 !py-1 text-xs text-red-600" konfirmasi={`Nonaktifkan ${p.nama}? Ia tidak bisa mengakses data lagi; riwayatnya tetap tersimpan.`}>
                      Nonaktifkan
                    </Submit>
                  </form>
                )}
              </div>
              {bisaUbah(p) && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-emerald-700">{p.aktif ? 'Ubah peran' : 'Aktifkan kembali'}</summary>
                  <form action={tetapkanPeran} className="mt-2 grid gap-3 sm:grid-cols-4 sm:items-end">
                    <input type="hidden" name="id" value={p.id} />
                    <IsianPeran peranTersedia={peranTersedia} p={p} />
                    <Submit varian="kedua">Simpan</Submit>
                  </form>
                </details>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

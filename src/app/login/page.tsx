import Link from 'next/link'
import { Field, Input, Pesan } from '@/components/ui'
import { Submit } from '@/components/submit'
import { supabaseSiap } from '@/lib/supabase/env'
import { masuk } from './actions'

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const sp = await searchParams
  if (sp.galat === 'profil') sp.galat = 'Akun ini belum terdaftar sebagai pengurus. Hubungi Super Admin.'
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-bold text-emerald-800">Masuk Pengurus</h1>
      <p className="mb-6 text-sm text-slate-600">Khusus pengurus RT/RW. Warga cukup membuka halaman laporan.</p>
      {!supabaseSiap && <Pesan sp={{ galat: 'Supabase belum dikonfigurasi (.env.local).' }} />}
      <Pesan sp={sp} />
      <form action={masuk} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <Field label="Email">
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" required autoComplete="current-password" />
        </Field>
        <Submit className="w-full">Masuk</Submit>
      </form>
      <Link href="/" className="mt-6 text-center text-sm text-emerald-700 underline">
        ← Lihat laporan publik
      </Link>
    </main>
  )
}

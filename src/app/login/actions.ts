'use server'
import { redirect } from 'next/navigation'
import { kembali, teks } from '@/lib/aksi'
import { createClient } from '@/lib/supabase/server'

export async function masuk(f: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: teks(f, 'email') ?? '',
    password: (f.get('password') as string) ?? '',
  })
  if (error) kembali('/login', { galat: 'Email atau password salah.' })
  redirect('/admin')
}

export async function keluar() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

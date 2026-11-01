import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { SUPABASE_KEY, SUPABASE_URL } from './env'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Dipanggil dari Server Component: sesi diperbarui oleh proxy.ts
        }
      },
    },
  })
}

// Klien dengan kunci rahasia — hanya untuk mengelola akun pengurus
export function createServiceClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SECRET_KEY belum diatur')
  return createAdminClient(SUPABASE_URL, key, { auth: { persistSession: false } })
}

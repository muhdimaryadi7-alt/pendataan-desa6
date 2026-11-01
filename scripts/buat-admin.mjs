// Membuat akun Super Admin pertama.
// Pemakaian: npm run buat-admin -- email@contoh.com "PasswordKuat123" "Nama Admin"
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })
const [email, password, nama = 'Super Admin'] = process.argv.slice(2)
if (!email || !password) {
  console.error('Pemakaian: npm run buat-admin -- <email> <password> "<nama>"')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SECRET_KEY wajib diisi di .env.local')
  process.exit(1)
}

const admin = createClient(url, key, { auth: { persistSession: false } })
const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
if (error) {
  console.error('Gagal membuat user:', error.message)
  process.exit(1)
}
const { error: e2 } = await admin
  .from('profiles')
  .insert({ id: data.user.id, nama, peran: 'super_admin', wilayah_id: 1 })
if (e2) {
  console.error('Gagal membuat profil:', e2.message)
  process.exit(1)
}
console.log(`Super Admin ${email} berhasil dibuat.`)

// Menjalankan supabase/schema.sql ke database Supabase.
// Butuh DATABASE_URL (Supabase > Project Settings > Database > Connection string) di .env.local
import { readFileSync } from 'node:fs'
import { config } from 'dotenv'
import pg from 'pg'

config({ path: '.env.local' })
const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL belum diisi di .env.local')
  process.exit(1)
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query(readFileSync('supabase/schema.sql', 'utf8'))
  console.log('Skema berhasil dipasang.')
} catch (e) {
  console.error('Gagal:', e.message)
  process.exitCode = 1
} finally {
  await client.end()
}

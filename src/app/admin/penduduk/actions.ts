'use server'
import { kembali, teks } from '@/lib/aksi'
import { createClient } from '@/lib/supabase/server'

function dataAnggota(f: FormData) {
  return {
    nik: teks(f, 'nik') ?? '',
    nama: teks(f, 'nama') ?? '',
    tempat_lahir: teks(f, 'tempat_lahir'),
    tgl_lahir: teks(f, 'tgl_lahir'),
    jk: teks(f, 'jk') ?? 'L',
    agama: teks(f, 'agama'),
    status_kawin: teks(f, 'status_kawin'),
    hubungan: teks(f, 'hubungan') ?? 'Anggota',
    pendidikan: teks(f, 'pendidikan'),
    pekerjaan: teks(f, 'pekerjaan'),
    no_hp: teks(f, 'no_hp'),
  }
}

const pesanGalat = (m: string) =>
  m.includes('duplicate')
    ? m.includes('nik') ? 'NIK sudah terdaftar.' : 'No. KK sudah terdaftar.'
    : m.includes('row-level') ? 'Anda tidak berhak mengubah data ini.' : m

export async function tambahKK(f: FormData) {
  const supabase = await createClient()
  const wilayah = Number(f.get('wilayah_id'))
  const { data: kk, error } = await supabase
    .from('kartu_keluarga')
    .insert({ no_kk: teks(f, 'no_kk'), alamat: teks(f, 'alamat'), wilayah_id: wilayah, status_hunian: teks(f, 'status_hunian') ?? 'tetap' })
    .select('id')
    .single()
  if (error) kembali(`/admin/penduduk?w=${wilayah}`, { galat: pesanGalat(error.message) })

  const { data: p, error: e2 } = await supabase
    .from('penduduk')
    .insert({ ...dataAnggota(f), kk_id: kk.id, wilayah_id: wilayah })
    .select('id')
    .single()
  if (e2) {
    await supabase.from('kartu_keluarga').delete().eq('id', kk.id)
    kembali(`/admin/penduduk?w=${wilayah}`, { galat: pesanGalat(e2.message) })
  }
  if (teks(f, 'asal') === 'masuk') {
    await supabase.from('mutasi_penduduk').insert({ penduduk_id: p.id, wilayah_id: wilayah, jenis: 'masuk' })
  }
  kembali(`/admin/penduduk/${kk.id}`, { pesan: 'KK berhasil ditambahkan. Lanjutkan menambah anggota keluarga.' })
}

export async function ubahKK(f: FormData) {
  const supabase = await createClient()
  const id = teks(f, 'id')!
  const { error } = await supabase
    .from('kartu_keluarga')
    .update({ no_kk: teks(f, 'no_kk'), alamat: teks(f, 'alamat'), status_hunian: teks(f, 'status_hunian'), aktif: f.get('aktif') === 'on' })
    .eq('id', id)
  kembali(`/admin/penduduk/${id}`, error ? { galat: pesanGalat(error.message) } : { pesan: 'Data KK disimpan.' })
}

export async function tambahAnggota(f: FormData) {
  const supabase = await createClient()
  const kk = teks(f, 'kk_id')!
  const wilayah = Number(f.get('wilayah_id'))
  const { data, error } = await supabase
    .from('penduduk')
    .insert({ ...dataAnggota(f), kk_id: kk, wilayah_id: wilayah })
    .select('id')
    .single()
  if (error) kembali(`/admin/penduduk/${kk}`, { galat: pesanGalat(error.message) })
  const asal = teks(f, 'asal')
  if (asal === 'lahir' || asal === 'masuk') {
    await supabase.from('mutasi_penduduk').insert({
      penduduk_id: data.id,
      wilayah_id: wilayah,
      jenis: asal,
      ...(asal === 'lahir' && teks(f, 'tgl_lahir') ? { tanggal: teks(f, 'tgl_lahir') } : {}),
    })
  }
  kembali(`/admin/penduduk/${kk}`, { pesan: 'Anggota keluarga ditambahkan.' })
}

export async function ubahAnggota(f: FormData) {
  const supabase = await createClient()
  const kk = teks(f, 'kk_id')!
  const { error } = await supabase.from('penduduk').update(dataAnggota(f)).eq('id', teks(f, 'id')!)
  kembali(`/admin/penduduk/${kk}`, error ? { galat: pesanGalat(error.message) } : { pesan: 'Data anggota disimpan.' })
}

export async function catatMutasi(f: FormData) {
  const supabase = await createClient()
  const kk = teks(f, 'kk_id')!
  const id = teks(f, 'id')!
  const jenis = teks(f, 'jenis') === 'meninggal' ? 'meninggal' : 'keluar'
  const { error } = await supabase
    .from('penduduk')
    .update({ status: jenis === 'meninggal' ? 'meninggal' : 'pindah' })
    .eq('id', id)
  if (error) kembali(`/admin/penduduk/${kk}`, { galat: pesanGalat(error.message) })
  await supabase.from('mutasi_penduduk').insert({
    penduduk_id: id,
    wilayah_id: Number(f.get('wilayah_id')),
    jenis,
    tanggal: teks(f, 'tanggal') ?? undefined,
    keterangan: teks(f, 'keterangan'),
  })
  kembali(`/admin/penduduk/${kk}`, { pesan: `Mutasi "${jenis}" dicatat.` })
}

export async function hapusAnggota(f: FormData) {
  const supabase = await createClient()
  const kk = teks(f, 'kk_id')!
  const { error } = await supabase.from('penduduk').delete().eq('id', teks(f, 'id')!)
  kembali(`/admin/penduduk/${kk}`, error ? { galat: pesanGalat(error.message) } : { pesan: 'Data anggota dihapus.' })
}

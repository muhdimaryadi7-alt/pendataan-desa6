import { Field, Input, Select } from '@/components/ui'

export type Anggota = {
  id: string; nik: string; nama: string; tempat_lahir: string | null; tgl_lahir: string | null; jk: 'L' | 'P'
  agama: string | null; status_kawin: string | null; hubungan: string; pendidikan: string | null
  pekerjaan: string | null; no_hp: string | null; status: string
}

const AGAMA = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu']
const KAWIN = ['Belum kawin', 'Kawin', 'Cerai hidup', 'Cerai mati']
const HUBUNGAN = ['Kepala Keluarga', 'Istri', 'Suami', 'Anak', 'Menantu', 'Cucu', 'Orang Tua', 'Mertua', 'Famili Lain', 'Lainnya']
const PENDIDIKAN = ['Tidak/belum sekolah', 'SD', 'SMP', 'SMA/SMK', 'D1-D3', 'S1', 'S2', 'S3']

// Isian data satu anggota keluarga (dipakai untuk tambah KK, tambah & ubah anggota)
export function IsianAnggota({ a, hubunganTetap }: { a?: Partial<Anggota>; hubunganTetap?: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="NIK (16 digit)"><Input name="nik" required pattern="[0-9]{16}" inputMode="numeric" defaultValue={a?.nik} /></Field>
      <Field label="Nama lengkap"><Input name="nama" required defaultValue={a?.nama} /></Field>
      <Field label="Tempat lahir"><Input name="tempat_lahir" defaultValue={a?.tempat_lahir ?? ''} /></Field>
      <Field label="Tanggal lahir"><Input name="tgl_lahir" type="date" defaultValue={a?.tgl_lahir ?? ''} /></Field>
      <Field label="Jenis kelamin">
        <Select name="jk" defaultValue={a?.jk ?? 'L'}><option value="L">Laki-laki</option><option value="P">Perempuan</option></Select>
      </Field>
      <Field label="Hubungan dalam KK">
        {hubunganTetap ? (
          <Input name="hubungan" readOnly value={hubunganTetap} />
        ) : (
          <Select name="hubungan" defaultValue={a?.hubungan ?? 'Anak'}>{HUBUNGAN.map((h) => <option key={h}>{h}</option>)}</Select>
        )}
      </Field>
      <Field label="Agama">
        <Select name="agama" defaultValue={a?.agama ?? ''}><option value="">-</option>{AGAMA.map((x) => <option key={x}>{x}</option>)}</Select>
      </Field>
      <Field label="Status perkawinan">
        <Select name="status_kawin" defaultValue={a?.status_kawin ?? ''}><option value="">-</option>{KAWIN.map((x) => <option key={x}>{x}</option>)}</Select>
      </Field>
      <Field label="Pendidikan terakhir">
        <Select name="pendidikan" defaultValue={a?.pendidikan ?? ''}><option value="">-</option>{PENDIDIKAN.map((x) => <option key={x}>{x}</option>)}</Select>
      </Field>
      <Field label="Pekerjaan"><Input name="pekerjaan" defaultValue={a?.pekerjaan ?? ''} /></Field>
      <Field label="No. HP"><Input name="no_hp" type="tel" defaultValue={a?.no_hp ?? ''} /></Field>
    </div>
  )
}

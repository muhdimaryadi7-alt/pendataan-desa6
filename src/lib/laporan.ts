export type Laporan = {
  wilayah: { id: number; nama: string; tipe: 'rt' | 'rw' }
  bulan: string
  saldo: number
  masuk_bulan: number
  keluar_bulan: number
  transaksi: { id: string; tanggal: string; tipe: 'masuk' | 'keluar'; kategori: string; nominal: number; keterangan: string | null; bukti_path: string | null }[]
  penduduk: { kk: number; jiwa: number; laki: number; perempuan: number; balita: number; anak: number; produktif: number; lansia: number }
  iuran: { total_kk: number; lunas: number; terkumpul: number; target: number }
  rapat_mendatang: { id: string; judul: string; mulai: string; lokasi: string | null; agenda: string | null }[]
  notulen: { id: string; judul: string; mulai: string; notulen: string; keputusan: string | null; jumlah_hadir: number | null }[]
}

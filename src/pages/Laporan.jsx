import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { FileText, FileSpreadsheet, Download, Calendar, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const BULAN_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export default function Laporan() {
  const [bulan, setBulan] = useState(new Date().getMonth() + 1)
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)

  // Fungsi ambil data kolektif
  async function getKolektifData() {
    setLoading(true)
    const tglAwal = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const tglAkhir = new Date(tahun, bulan, 0).toISOString().split('T')[0]

    const [pelanggan, pembayaran, pengeluaran] = await Promise.all([
      supabase.from('pelanggan').select('*').order('nama'),
      supabase.from('pembayaran').select('*, pelanggan(nama, wilayah)').eq('bulan', bulan).eq('tahun', tahun),
      supabase.from('pengeluaran').select('*').gte('tanggal', tglAwal).lte('tanggal', tglAkhir).order('tanggal')
    ])

    setLoading(false)
    return { 
      pelanggan: pelanggan.data || [], 
      pembayaran: pembayaran.data || [], 
      pengeluaran: pengeluaran.data || [] 
    }
  }

  // =====================
  // EXPORT EXCEL (MULTI-SHEET)
  // =====================
  async function exportExcel() {
    const { pelanggan, pembayaran, pengeluaran } = await getKolektifData()
    const wb = XLSX.utils.book_new()

    // Sheet Pelanggan
    const wsPel = XLSX.utils.json_to_sheet(pelanggan.map((p, i) => ({
      No: i + 1, Nama: p.nama, Wilayah: p.wilayah, Paket: p.paket, Harga: p.harga_paket, Status: p.status
    })))
    XLSX.utils.book_append_sheet(wb, wsPel, 'Data Pelanggan')

    // Sheet Pembayaran
    const wsPem = XLSX.utils.json_to_sheet(pembayaran.map((p, i) => ({
      No: i + 1, Nama: p.pelanggan?.nama, Wilayah: p.pelanggan?.wilayah, Jumlah: p.jumlah, Status: p.status, 'Tgl Bayar': p.tanggal_bayar || '-'
    })))
    XLSX.utils.book_append_sheet(wb, wsPem, 'Pembayaran')

    // Sheet Kas/Pengeluaran
    const wsPeng = XLSX.utils.json_to_sheet(pengeluaran.map((p, i) => ({
      No: i + 1, Tanggal: p.tanggal, Keterangan: p.keterangan, Kategori: p.kategori, Jumlah: p.jumlah
    })))
    XLSX.utils.book_append_sheet(wb, wsPeng, 'Pengeluaran')

    XLSX.writeFile(wb, `Laporan_Lengkap_${BULAN_FULL[bulan-1]}_${tahun}.xlsx`)
  }

  // =====================
  // EXPORT PDF (REKAPITULASI)
  // =====================
  async function exportPDF() {
    const { pelanggan, pembayaran, pengeluaran } = await getKolektifData()
    const doc = new jsPDF()
    const title = `LAPORAN BULANAN WIFI - ${BULAN_FULL[bulan-1].toUpperCase()} ${tahun}`

    doc.setFontSize(16); doc.text(title, 105, 15, { align: 'center' })
    
    // Ringkasan Keuangan
    const totalMasuk = pembayaran.filter(p => p.status === 'lunas').reduce((s, p) => s + p.jumlah, 0)
    const totalKeluar = pengeluaran.reduce((s, p) => s + p.jumlah, 0)
    
    doc.setFontSize(10)
    doc.text(`Total Pemasukan (Lunas): Rp ${totalMasuk.toLocaleString()}`, 14, 25)
    doc.text(`Total Pengeluaran: Rp ${totalKeluar.toLocaleString()}`, 14, 30)
    doc.text(`Laba Bersih: Rp ${(totalMasuk - totalKeluar).toLocaleString()}`, 14, 35)

    // Tabel Pembayaran
    doc.text("RINCIAN PEMBAYARAN", 14, 45)
    autoTable(doc, {
      startY: 48,
      head: [['Nama', 'Wilayah', 'Jumlah', 'Status']],
      body: pembayaran.map(p => [p.pelanggan?.nama, p.pelanggan?.wilayah, p.jumlah, p.status]),
      theme: 'striped', headStyles: { fillColor: [59, 130, 246] }
    })

    // Tabel Pengeluaran (Halaman baru jika perlu)
    doc.addPage()
    doc.text("RINCIAN PENGELUARAN (KAS KELUAR)", 14, 15)
    autoTable(doc, {
      startY: 20,
      head: [['Tanggal', 'Keterangan', 'Kategori', 'Jumlah']],
      body: pengeluaran.map(p => [p.tanggal, p.keterangan, p.kategori, p.jumlah]),
      theme: 'grid', headStyles: { fillColor: [239, 68, 68] }
    })

    doc.save(`Laporan_PDF_${BULAN_FULL[bulan-1]}_${tahun}.pdf`)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800">Pusat Laporan Terpadu</h1>
        <p className="text-slate-500 mt-2">Unduh seluruh data operasional dan keuangan dalam satu file</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-8">
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <Calendar size={20} className="text-blue-500" />
            <select value={bulan} onChange={e => setBulan(Number(e.target.value))} className="bg-transparent font-medium outline-none">
              {BULAN_FULL.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
            </select>
            <input type="number" value={tahun} onChange={e => setTahun(Number(e.target.value))} className="w-20 bg-transparent font-medium outline-none border-l pl-3" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Tombol Excel */}
          <button 
            onClick={exportExcel}
            disabled={loading}
            className="flex flex-col items-center p-8 border-2 border-dashed border-green-200 rounded-3xl hover:bg-green-50 hover:border-green-400 transition-all group"
          >
            <div className="bg-green-100 text-green-600 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
              {loading ? <Loader2 className="animate-spin" /> : <FileSpreadsheet size={32} />}
            </div>
            <h3 className="font-bold text-slate-800">Eksport ke Excel</h3>
            <p className="text-xs text-slate-500 mt-1 text-center">Data pelanggan, pembayaran, & kas dalam sheet terpisah</p>
          </button>

          {/* Tombol PDF */}
          <button 
            onClick={exportPDF}
            disabled={loading}
            className="flex flex-col items-center p-8 border-2 border-dashed border-red-200 rounded-3xl hover:bg-red-50 hover:border-red-400 transition-all group"
          >
            <div className="bg-red-100 text-red-600 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
              {loading ? <Loader2 className="animate-spin" /> : <FileText size={32} />}
            </div>
            <h3 className="font-bold text-slate-800">Eksport ke PDF</h3>
            <p className="text-xs text-slate-500 mt-1 text-center">Rekapitulasi keuangan dan rincian transaksi bulanan</p>
          </button>
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex gap-4">
        <Download className="text-blue-500 shrink-0" size={20} />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Info:</strong> Fitur eksport ini akan secara otomatis menarik data terbaru dari wilayah <strong>Derofiza 1 & 2</strong> serta <strong>Mustamindo 3 & 4</strong> sesuai dengan periode bulan yang Anda pilih.
        </p>
      </div>
    </div>
  )
}
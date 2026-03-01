import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, CreditCard, FileSpreadsheet, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { cetakKwitansi } from '../components/Kwitansi'
import { Printer } from 'lucide-react'


const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const statusColor = { lunas: 'bg-green-50 text-green-700', belum_bayar: 'bg-red-50 text-red-600', terlambat: 'bg-yellow-50 text-yellow-700' }

export default function Pembayaran() {
  const [data, setData] = useState([])
  const [search, setSearch] = useState('')
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())
  const [filterStatus, setFilterStatus] = useState('semua')
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchData() }, [filterBulan, filterTahun])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('pembayaran')
      .select('*, pelanggan(nama, paket, no_hp)')
      .eq('bulan', filterBulan)
      .eq('tahun', filterTahun)
      .order('created_at', { ascending: false })
    setData(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('pembayaran').update({ status, tanggal_bayar: new Date().toISOString().split('T')[0] }).eq('id', id)
    fetchData()
  }

  // =====================
  // EXPORT EXCEL
  // =====================
  function exportExcel() {
    const rows = filtered.map((p, i) => ({
      'No': i + 1,
      'Nama Pelanggan': p.pelanggan?.nama || '-',
      'No HP': p.pelanggan?.no_hp || '-',
      'Paket': p.pelanggan?.paket || '-',
      'No Kwitansi': p.kwitansi_no || '-',
      'Bulan': BULAN[p.bulan - 1],
      'Tahun': p.tahun,
      'Jumlah (Rp)': p.jumlah,
      'Metode Bayar': p.metode_bayar || '-',
      'Tanggal Bayar': p.tanggal_bayar || '-',
      'Status': p.status.replace('_', ' '),
      'Keterangan': p.keterangan || '-',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()

    // Lebar kolom
    ws['!cols'] = [
      { wch: 4 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
      { wch: 18 }, { wch: 12 }, { wch: 6 }, { wch: 15 },
      { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 20 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, `Pembayaran ${BULAN[filterBulan - 1]} ${filterTahun}`)
    XLSX.writeFile(wb, `Laporan_Pembayaran_${BULAN[filterBulan - 1]}_${filterTahun}.xlsx`)
  }

  // =====================
  // EXPORT PDF
  // =====================
  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' })

    // Header
    doc.setFontSize(16)
    doc.setTextColor(30, 64, 175)
    doc.text('WiFi Manager', 14, 15)

    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Laporan Pembayaran - ${BULAN[filterBulan - 1]} ${filterTahun}`, 14, 23)
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 30)

    // Ringkasan
    doc.setFontSize(10)
    doc.setTextColor(0)
    doc.text(`Total Lunas: Rp ${totalLunas.toLocaleString('id-ID')}`, 14, 40)
    doc.text(`Sudah Bayar: ${data.filter(d => d.status === 'lunas').length} orang`, 90, 40)
    doc.text(`Belum Bayar: ${totalBelum} orang`, 160, 40)

    // Tabel
    autoTable(doc, {
      startY: 46,
      head: [['No', 'Nama', 'No HP', 'Paket', 'No Kwitansi', 'Jumlah', 'Metode', 'Tgl Bayar', 'Status']],
      body: filtered.map((p, i) => [
        i + 1,
        p.pelanggan?.nama || '-',
        p.pelanggan?.no_hp || '-',
        p.pelanggan?.paket || '-',
        p.kwitansi_no || '-',
        `Rp ${Number(p.jumlah).toLocaleString('id-ID')}`,
        p.metode_bayar || '-',
        p.tanggal_bayar || '-',
        p.status.replace('_', ' '),
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 8 },
        5: { halign: 'right' },
        8: { cellWidth: 20 },
      },
    })

    doc.save(`Laporan_Pembayaran_${BULAN[filterBulan - 1]}_${filterTahun}.pdf`)
  }

  const filtered = data.filter(d => {
    const matchSearch = d.pelanggan?.nama?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'semua' || d.status === filterStatus
    return matchSearch && matchStatus
  })

  const totalLunas = data.filter(d => d.status === 'lunas').reduce((s, d) => s + d.jumlah, 0)
  const totalBelum = data.filter(d => d.status !== 'lunas').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pembayaran</h1>
          <p className="text-slate-400 text-sm">{BULAN[filterBulan - 1]} {filterTahun}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <FileSpreadsheet size={16} /> Export Excel
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <FileText size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 mb-1">Total Lunas</p>
          <p className="text-2xl font-bold text-green-600">Rp {totalLunas.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 mb-1">Sudah Bayar</p>
          <p className="text-2xl font-bold text-slate-800">{data.filter(d => d.status === 'lunas').length} orang</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 mb-1">Belum Bayar</p>
          <p className="text-2xl font-bold text-red-600">{totalBelum} orang</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama..."
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
          </div>
          <select value={filterBulan} onChange={e => setFilterBulan(Number(e.target.value))}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {BULAN.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
          </select>
          <input type="number" value={filterTahun} onChange={e => setFilterTahun(Number(e.target.value))}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="semua">Semua Status</option>
            <option value="lunas">Lunas</option>
            <option value="belum_bayar">Belum Bayar</option>
            <option value="terlambat">Terlambat</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                {['No','Pelanggan','Paket','No Kwitansi','Jumlah','Metode','Tgl Bayar','Status','Aksi'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">Memuat data...</td></tr>
              ) : filtered.map((p, i) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{p.pelanggan?.nama}</p>
                    <p className="text-slate-400 text-xs">{p.pelanggan?.no_hp}</p>
                  </td>
                  <td className="px-4 py-3"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">{p.pelanggan?.paket}</span></td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">{p.kwitansi_no || '-'}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">Rp {Number(p.jumlah).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-slate-500">{p.metode_bayar || '-'}</td>
                  <td className="px-4 py-3 text-slate-500">{p.tanggal_bayar || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[p.status]}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
               <td className="px-4 py-3">
  <div className="flex items-center gap-2">
    {p.status !== 'lunas' && (
      <button onClick={() => updateStatus(p.id, 'lunas')}
        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
        Tandai Lunas
      </button>
    )}
    {p.status === 'lunas' && (
      <button onClick={() => cetakKwitansi(p, p.pelanggan)}
        className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
        <Printer size={13} /> Kwitansi
      </button>
    )}
  </div>
</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
              <p>Tidak ada data pembayaran</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, CreditCard, FileSpreadsheet, FileText, Printer, PlusCircle, X, Eye } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { cetakKwitansi } from '../components/Kwitansi'

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const statusColor = { lunas: 'bg-green-50 text-green-700', belum_bayar: 'bg-red-50 text-red-600', terlambat: 'bg-yellow-50 text-yellow-700' }

export default function Pembayaran() {
  const [data, setData] = useState([])
  const [search, setSearch] = useState('')
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())
  const [filterStatus, setFilterStatus] = useState('semua')
  const [loading, setLoading] = useState(false)

  // State untuk Modal Form Bayar
  const [showModal, setShowModal] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [formBayar, setFormBayar] = useState({ 
    tanggal_bayar: new Date().toISOString().split('T')[0], 
    metode_bayar: 'Cash' 
  })

  // State untuk Modal Detail
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailData, setDetailData] = useState(null)

  useEffect(() => { fetchData() }, [filterBulan, filterTahun])

  async function fetchData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('pembayaran')
      .select('*, pelanggan(nama, paket, no_hp, harga_paket)')
      .eq('bulan', filterBulan)
      .eq('tahun', filterTahun)
      .order('created_at', { ascending: false })
      
    if (error) console.error(error)
    setData(data || [])
    setLoading(false)
  }

  // =====================
  // FUNGSI FORM PEMBAYARAN
  // =====================
  function bukaFormBayar(id) {
    setSelectedId(id)
    setFormBayar({ 
      tanggal_bayar: new Date().toISOString().split('T')[0], 
      metode_bayar: 'Cash' 
    })
    setShowModal(true)
  }

  async function submitPembayaran(e) {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.from('pembayaran').update({ 
      status: 'lunas', 
      tanggal_bayar: formBayar.tanggal_bayar,
      metode_bayar: formBayar.metode_bayar
    }).eq('id', selectedId)
    
    if (error) {
      alert('Gagal menyimpan: ' + error.message)
    } else {
      setShowModal(false)
      fetchData() 
    }
    setLoading(false)
  }

  // =====================
  // FUNGSI DETAIL PEMBAYARAN
  // =====================
  function bukaDetail(p) {
    setDetailData(p)
    setShowDetailModal(true)
  }

  // =====================
  // BUAT TAGIHAN MASSAL
  // =====================
  async function buatTagihanMassal() {
    if (!confirm(`Buat tagihan untuk semua pelanggan aktif di bulan ${BULAN[filterBulan - 1]} ${filterTahun}?`)) return
    setLoading(true)
    
    const { data: pelangganAktif } = await supabase.from('pelanggan').select('*').eq('status', 'aktif')
    const { data: tagihanAda } = await supabase.from('pembayaran')
      .select('pelanggan_id')
      .eq('bulan', filterBulan)
      .eq('tahun', filterTahun)

    const idTagihanAda = tagihanAda?.map(t => t.pelanggan_id) || []
    const pelangganBelumDitagih = pelangganAktif?.filter(p => !idTagihanAda.includes(p.id)) || []

    if (pelangganBelumDitagih.length === 0) {
      alert(`Semua pelanggan aktif sudah dibuatkan tagihan untuk ${BULAN[filterBulan - 1]} ${filterTahun}.`)
      setLoading(false)
      return
    }

    const dataInsert = pelangganBelumDitagih.map(p => ({
      pelanggan_id: p.id,
      bulan: filterBulan,
      tahun: filterTahun,
      jumlah: p.harga_paket,
      status: 'belum_bayar'
    }))

    const { error } = await supabase.from('pembayaran').insert(dataInsert)
    if (!error) {
      alert(`Berhasil membuat ${dataInsert.length} tagihan baru!`)
      fetchData()
    } else {
      alert('Gagal membuat tagihan: ' + error.message)
    }
    setLoading(false)
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

    doc.setFontSize(16)
    doc.setTextColor(30, 64, 175)
    doc.text('WiFi Manager', 14, 15)

    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Laporan Pembayaran - ${BULAN[filterBulan - 1]} ${filterTahun}`, 14, 23)
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 30)

    doc.setFontSize(10)
    doc.setTextColor(0)
    doc.text(`Total Lunas: Rp ${totalLunas.toLocaleString('id-ID')}`, 14, 40)
    doc.text(`Sudah Bayar: ${data.filter(d => d.status === 'lunas').length} orang`, 90, 40)
    doc.text(`Belum Bayar: ${totalBelum} orang`, 160, 40)

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
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pembayaran</h1>
          <p className="text-slate-400 text-sm">{BULAN[filterBulan - 1]} {filterTahun}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={buatTagihanMassal} disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            <PlusCircle size={16} /> Generate Tagihan
          </button>
          
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
                {['No','Pelanggan','Paket','Jumlah','Tgl Bayar','Status','Aksi'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Memuat data...</td></tr>
              ) : filtered.map((p, i) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{p.pelanggan?.nama}</p>
                    <p className="text-slate-400 text-xs">{p.pelanggan?.no_hp}</p>
                  </td>
                  <td className="px-4 py-3"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">{p.pelanggan?.paket}</span></td>
                  <td className="px-4 py-3 font-medium text-slate-700">Rp {Number(p.jumlah).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {p.tanggal_bayar ? new Date(p.tanggal_bayar).toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[p.status]}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {/* Tombol Detail Baru */}
                      <button onClick={() => bukaDetail(p)}
                        className="p-1.5 hover:bg-slate-200 bg-slate-100 text-slate-600 rounded-lg transition-colors" title="Detail Tagihan">
                        <Eye size={15} />
                      </button>
                      
                      {p.status !== 'lunas' && (
                        <button onClick={() => bukaFormBayar(p.id)}
                          className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                          Bayar
                        </button>
                      )}
                      {p.status === 'lunas' && (
                        <button onClick={() => cetakKwitansi(p, p.pelanggan)}
                          className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                          <Printer size={13} /> Struk
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

      {/* MODAL FORM PEMBAYARAN */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Form Pembayaran</h2>
            
            <form onSubmit={submitPembayaran} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal Bayar</label>
                <input type="date" required 
                  value={formBayar.tanggal_bayar} 
                  onChange={e => setFormBayar({...formBayar, tanggal_bayar: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Metode Pembayaran</label>
                <select 
                  value={formBayar.metode_bayar} 
                  onChange={e => setFormBayar({...formBayar, metode_bayar: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Transfer">Transfer</option>
                  <option value="QRIS">QRIS</option>
                  <option value="GoPay">GoPay</option>
                  <option value="OVO">OVO</option>
                  <option value="Dana">Dana</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <button type="submit" disabled={loading}
                className="w-full mt-2 bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                {loading ? 'Menyimpan...' : 'Simpan Pembayaran'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAIL PEMBAYARAN */}
      {showDetailModal && detailData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <button onClick={() => setShowDetailModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1">
              <X size={18} />
            </button>
            
            <div className="flex flex-col items-center mb-6 pt-2">
              <div className={`p-3 rounded-full mb-3 ${detailData.status === 'lunas' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                <CreditCard size={28} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Detail Tagihan</h2>
              <p className="text-slate-500 text-sm">{BULAN[detailData.bulan - 1]} {detailData.tahun}</p>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500">Status</span>
                <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${statusColor[detailData.status]}`}>
                  {detailData.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">No. Kwitansi</span>
                <span className="font-mono text-slate-800 font-medium">{detailData.kwitansi_no || '-'}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Nama Pelanggan</span>
                <span className="text-slate-800 font-medium text-right">{detailData.pelanggan?.nama}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Paket</span>
                <span className="text-slate-800 font-medium text-right">{detailData.pelanggan?.paket}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Metode Bayar</span>
                <span className="text-slate-800 font-medium">{detailData.metode_bayar || '-'}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Tgl Bayar</span>
                <span className="text-slate-800 font-medium">
                  {detailData.tanggal_bayar ? new Date(detailData.tanggal_bayar).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                </span>
              </div>

              <div className="flex justify-between py-3">
                <span className="text-slate-800 font-semibold">Total Tagihan</span>
                <span className="text-blue-600 font-bold text-base">Rp {Number(detailData.jumlah).toLocaleString('id-ID')}</span>
              </div>
            </div>
            
          </div>
        </div>
      )}

    </div>
  )
}
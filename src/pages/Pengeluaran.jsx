import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PlusCircle, Search, Edit2, Trash2, TrendingDown, Receipt, X, FileSpreadsheet, PieChart, Calendar } from 'lucide-react'
import * as XLSX from 'xlsx'

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const KATEGORI = ['Bandwidth/ISP', 'Alat/Material', 'Operasional', 'Gaji/Teknisi', 'Lainnya']
const emptyForm = { tanggal: new Date().toISOString().split('T')[0], keterangan: '', kategori: 'Lainnya', jumlah: '' }

export default function Pengeluaran() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())

  // State Modal
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)

  useEffect(() => { fetchData() }, [filterBulan, filterTahun])

  async function fetchData() {
    setLoading(true)
    const tglAwal = `${filterTahun}-${String(filterBulan).padStart(2, '0')}-01`
    const tglAkhir = new Date(filterTahun, filterBulan, 0).toISOString().split('T')[0]

    const { data } = await supabase
      .from('pengeluaran')
      .select('*')
      .gte('tanggal', tglAwal)
      .lte('tanggal', tglAkhir)
      .order('tanggal', { ascending: false })

    setData(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (editId) {
        await supabase.from('pengeluaran').update(form).eq('id', editId)
      } else {
        await supabase.from('pengeluaran').insert([form])
      }
      setShowModal(false)
      setForm(emptyForm)
      setEditId(null)
      fetchData()
    } catch (err) {
      alert('Gagal menyimpan data')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus catatan pengeluaran ini?')) return
    await supabase.from('pengeluaran').delete().eq('id', id)
    fetchData()
  }

  function exportExcel() {
    const rows = filtered.map((d, i) => ({
      'No': i + 1,
      'Tanggal': d.tanggal,
      'Keterangan': d.keterangan,
      'Kategori': d.kategori,
      'Jumlah (Rp)': d.jumlah
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pengeluaran')
    XLSX.writeFile(wb, `Pengeluaran_${BULAN[filterBulan-1]}_${filterTahun}.xlsx`)
  }

  function openEdit(p) {
    setForm({ 
      tanggal: p.tanggal, 
      keterangan: p.keterangan, 
      kategori: p.kategori, 
      jumlah: p.jumlah 
    })
    setEditId(p.id)
    setShowModal(true)
  }

  const filtered = data.filter(d => d.keterangan.toLowerCase().includes(search.toLowerCase()))
  const totalPengeluaran = filtered.reduce((sum, item) => sum + item.jumlah, 0)

  // Hitung total per kategori untuk ringkasan
  const statsKategori = KATEGORI.map(kat => ({
    nama: kat,
    total: filtered.filter(d => d.kategori === kat).reduce((s, d) => s + d.jumlah, 0)
  })).filter(s => s.total > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Buku Kas Pengeluaran</h1>
          <p className="text-slate-400 text-sm">Monitor biaya operasional dan arus kas keluar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <FileSpreadsheet size={16} /> Export
          </button>
          <button onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <PlusCircle size={16} /> Tambah
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
            <TrendingDown size={28} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total {BULAN[filterBulan-1]}</p>
            <p className="text-2xl font-bold text-slate-800">Rp {totalPengeluaran.toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 overflow-x-auto">
          <div className="flex items-center gap-2 mb-3">
            <PieChart size={16} className="text-slate-400" />
            <p className="text-xs font-bold text-slate-500 uppercase">Distribusi Biaya</p>
          </div>
          <div className="flex gap-4">
            {statsKategori.map(s => (
              <div key={s.nama} className="shrink-0">
                <p className="text-[10px] text-slate-400 font-medium mb-1">{s.nama}</p>
                <p className="text-sm font-bold text-slate-700">Rp {s.total.toLocaleString('id-ID')}</p>
              </div>
            ))}
            {statsKategori.length === 0 && <p className="text-sm text-slate-400 italic">Belum ada data bulan ini</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari keterangan..."
              className="pl-9 pr-4 py-2 w-full text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2">
            <select value={filterBulan} onChange={e => setFilterBulan(Number(e.target.value))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {BULAN.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
            </select>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="number" value={filterTahun} onChange={e => setFilterTahun(Number(e.target.value))}
                className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider text-left">
              <tr>
                <th className="px-5 py-4">Tanggal</th>
                <th className="px-5 py-4">Keterangan</th>
                <th className="px-5 py-4">Kategori</th>
                <th className="px-5 py-4 text-right">Jumlah (Rp)</th>
                <th className="px-5 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400 animate-pulse">Memperbarui data...</td></tr>
              ) : filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                    {new Date(d.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-800">{d.keterangan}</td>
                  <td className="px-5 py-4">
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-slate-200 uppercase">
                      {d.kategori}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold text-red-600 text-right whitespace-nowrap">
                    - Rp {Number(d.jumlah).toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(d)} className="p-2 hover:bg-yellow-50 text-yellow-600 rounded-lg" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(d.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg" title="Hapus">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="text-center py-20 bg-slate-50/50">
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Receipt size={32} className="text-slate-200" />
              </div>
              <p className="text-slate-400 font-medium">Tidak ada catatan pengeluaran ditemukan</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowModal(false)} className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-6">{editId ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tanggal Transaksi</label>
                  <input required type="date" value={form.tanggal} onChange={e => setForm({...form, tanggal: e.target.value})}
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Keterangan / Deskripsi</label>
                  <input required type="text" value={form.keterangan} onChange={e => setForm({...form, keterangan: e.target.value})}
                    placeholder="Contoh: Pembayaran listrik ODP Blok A"
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Kategori</label>
                  <select required value={form.kategori} onChange={e => setForm({...form, kategori: e.target.value})}
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {KATEGORI.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Jumlah (Rp)</label>
                  <input required type="number" value={form.jumlah} onChange={e => setForm({...form, jumlah: e.target.value})}
                    placeholder="0"
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-50 text-red-700 font-bold" />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full mt-4 bg-slate-900 text-white py-4 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-slate-200">
                {loading ? 'Memproses...' : 'Simpan Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PlusCircle, Search, AlertTriangle, Clock, CheckCircle, X, Wrench } from 'lucide-react'

const PRIORITAS_WARNA = {
  rendah: 'bg-slate-100 text-slate-700',
  normal: 'bg-blue-100 text-blue-700',
  tinggi: 'bg-red-100 text-red-700'
}

const STATUS_WARNA = {
  open: 'bg-yellow-100 text-yellow-700',
  proses: 'bg-blue-100 text-blue-700',
  selesai: 'bg-green-100 text-green-700'
}

export default function Komplain() {
  const [data, setData] = useState([])
  const [pelangganAktif, setPelangganAktif] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('semua')
  const [loading, setLoading] = useState(false)

  // State Modal Tambah Komplain
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ pelanggan_id: '', judul: '', deskripsi: '', prioritas: 'normal' })

  // State Modal Selesaikan Komplain (Teknisi)
  const [showSelesaiModal, setShowSelesaiModal] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [catatanTeknisi, setCatatanTeknisi] = useState('')

  useEffect(() => { 
    fetchData()
    fetchPelanggan()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('komplain')
      .select('*, pelanggan(nama, no_hp, alamat)')
      .order('created_at', { ascending: false })
    setData(data || [])
    setLoading(false)
  }

  async function fetchPelanggan() {
    const { data } = await supabase.from('pelanggan').select('id, nama').eq('status', 'aktif').order('nama')
    setPelangganAktif(data || [])
  }

  // =====================
  // FUNGSI TAMBAH KOMPLAIN
  // =====================
  async function submitKomplain(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('komplain').insert([form])
    
    if (error) alert('Gagal menambah komplain: ' + error.message)
    else {
      setShowModal(false)
      setForm({ pelanggan_id: '', judul: '', deskripsi: '', prioritas: 'normal' })
      fetchData()
    }
    setLoading(false)
  }

  // =====================
  // FUNGSI UPDATE STATUS
  // =====================
  async function updateStatus(id, status_baru) {
    if (status_baru === 'selesai') {
      setSelectedId(id)
      setCatatanTeknisi('')
      setShowSelesaiModal(true)
      return
    }

    const konfirmasi = confirm(`Ubah status tiket ini menjadi ${status_baru.toUpperCase()}?`)
    if (!konfirmasi) return

    await supabase.from('komplain').update({ status: status_baru }).eq('id', id)
    fetchData()
  }

  async function submitSelesai(e) {
    e.preventDefault()
    setLoading(true)
    await supabase.from('komplain').update({ 
      status: 'selesai',
      catatan_teknisi: catatanTeknisi,
      tanggal_selesai: new Date().toISOString()
    }).eq('id', selectedId)

    setShowSelesaiModal(false)
    fetchData()
    setLoading(false)
  }

  const filtered = data.filter(d => {
    const matchSearch = d.pelanggan?.nama?.toLowerCase().includes(search.toLowerCase()) || d.judul.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'semua' || d.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tiket Gangguan</h1>
          <p className="text-slate-400 text-sm">Kelola laporan komplain & perbaikan jaringan pelanggan</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          <PlusCircle size={16} /> Buat Tiket
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau judul..."
              className="pl-9 pr-4 py-2 w-full text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40">
            <option value="semua">Semua Status</option>
            <option value="open">Menunggu (Open)</option>
            <option value="proses">Dikerjakan (Proses)</option>
            <option value="selesai">Selesai</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider text-left">
              <tr>
                <th className="px-5 py-3">Tanggal Lapor</th>
                <th className="px-5 py-3">Pelanggan</th>
                <th className="px-5 py-3">Kendala (Judul)</th>
                <th className="px-5 py-3">Prioritas</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Aksi Teknisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-500">Memuat data...</td></tr>
              ) : filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                    {new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800">{d.pelanggan?.nama}</p>
                    <p className="text-xs text-slate-500">{d.pelanggan?.no_hp || '-'}</p>
                  </td>
                  <td className="px-5 py-4 min-w-[200px]">
                    <p className="font-medium text-slate-800">{d.judul}</p>
                    <p className="text-xs text-slate-500 truncate max-w-xs" title={d.deskripsi}>{d.deskripsi}</p>
                    {d.status === 'selesai' && d.catatan_teknisi && (
                      <p className="text-xs text-green-600 mt-1 bg-green-50 p-1 rounded inline-block">Teknisi: {d.catatan_teknisi}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${PRIORITAS_WARNA[d.prioritas]}`}>
                      {d.prioritas.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_WARNA[d.status]}`}>
                      {d.status === 'open' && <AlertTriangle size={12} />}
                      {d.status === 'proses' && <Wrench size={12} />}
                      {d.status === 'selesai' && <CheckCircle size={12} />}
                      {d.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {d.status === 'open' && (
                      <button onClick={() => updateStatus(d.id, 'proses')}
                        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
                        Proses Tiket
                      </button>
                    )}
                    {d.status === 'proses' && (
                      <button onClick={() => updateStatus(d.id, 'selesai')}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                        Selesaikan
                      </button>
                    )}
                    {d.status === 'selesai' && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <CheckCircle size={14} className="text-green-500"/> Selesai
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <CheckCircle size={40} className="mx-auto mb-3 text-green-300 opacity-50" />
              <p>Tidak ada tiket komplain aktif. Semua aman!</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL BUAT TIKET */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="text-yellow-500" /> Buat Tiket Gangguan
            </h2>
            
            <form onSubmit={submitKomplain} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Pilih Pelanggan *</label>
                <select required value={form.pelanggan_id} onChange={e => setForm({...form, pelanggan_id: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Pilih Pelanggan --</option>
                  {pelangganAktif.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Judul Kendala * (Contoh: LOS Merah, Putus)</label>
                <input required type="text" value={form.judul} onChange={e => setForm({...form, judul: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Prioritas</label>
                <select value={form.prioritas} onChange={e => setForm({...form, prioritas: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="rendah">Rendah (Pengecekan Rutin)</option>
                  <option value="normal">Normal (Internet Lambat/Mati 1 Rumah)</option>
                  <option value="tinggi">Tinggi (Kabel Utama Putus / Mati Total)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Deskripsi Tambahan</label>
                <textarea rows="3" value={form.deskripsi} onChange={e => setForm({...form, deskripsi: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Detail masalah yang dilaporkan pelanggan..."></textarea>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                {loading ? 'Menyimpan...' : 'Simpan Tiket'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PENYELESAIAN TIKET (TEKNISI) */}
      {showSelesaiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <button onClick={() => setShowSelesaiModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle className="text-green-500" /> Selesaikan Tiket
            </h2>
            
            <form onSubmit={submitSelesai} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Catatan Teknisi (Opsional)</label>
                <textarea rows="3" value={catatanTeknisi} onChange={e => setCatatanTeknisi(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Contoh: Sudah diganti kabel dropcore 50m / konektor longgar..."></textarea>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                {loading ? 'Menyimpan...' : 'Tandai Selesai'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
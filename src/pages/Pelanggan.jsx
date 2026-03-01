import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit2, Trash2, Eye, CheckCircle, XCircle, Users } from 'lucide-react'

const PAKET = ['10 Mbps', '20 Mbps', '30 Mbps', '50 Mbps', '100 Mbps']
const emptyForm = { nama: '', alamat: '', no_hp: '', email: '', paket: '10 Mbps', harga_paket: '', tanggal_jatuh_tempo: 1, status: 'aktif', catatan: '' }

export default function Pelanggan() {
  const [data, setData] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('semua')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data } = await supabase.from('pelanggan').select('*').order('created_at', { ascending: false })
    setData(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    if (editId) {
      await supabase.from('pelanggan').update(form).eq('id', editId)
    } else {
      await supabase.from('pelanggan').insert(form)
    }
    await fetchData()
    setShowModal(false)
    setForm(emptyForm)
    setEditId(null)
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('Hapus pelanggan ini? Semua data pembayaran juga akan terhapus.')) return
    await supabase.from('pelanggan').delete().eq('id', id)
    fetchData()
  }

  function openEdit(p) {
    setForm({ nama: p.nama, alamat: p.alamat || '', no_hp: p.no_hp || '', email: p.email || '', paket: p.paket, harga_paket: p.harga_paket, tanggal_jatuh_tempo: p.tanggal_jatuh_tempo || 1, status: p.status, catatan: p.catatan || '' })
    setEditId(p.id)
    setShowModal(true)
  }

  const filtered = data.filter(p => {
    const matchSearch = p.nama.toLowerCase().includes(search.toLowerCase()) || p.no_hp?.includes(search)
    const matchStatus = filterStatus === 'semua' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pelanggan</h1>
          <p className="text-slate-400 text-sm">{data.length} total pelanggan</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> Tambah Pelanggan
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
              placeholder="Cari nama atau no HP..." />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="semua">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
            <option value="suspend">Suspend</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                {['Nama', 'No HP', 'Paket', 'Harga/Bulan', 'Jatuh Tempo', 'Status', 'Aksi'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.nama}</td>
                  <td className="px-4 py-3 text-slate-500">{p.no_hp || '-'}</td>
                  <td className="px-4 py-3"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">{p.paket}</span></td>
                  <td className="px-4 py-3 text-slate-600 font-medium">Rp {Number(p.harga_paket).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-slate-500">Tgl {p.tanggal_jatuh_tempo}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 w-fit px-2 py-1 rounded-full text-xs font-medium ${
                      p.status === 'aktif' ? 'bg-green-50 text-green-700' :
                      p.status === 'suspend' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {p.status === 'aktif' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/pelanggan/${p.id}`)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg" title="Detail"><Eye size={15} /></button>
                      <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-yellow-50 text-yellow-600 rounded-lg" title="Edit"><Edit2 size={15} /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg" title="Hapus"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>Tidak ada data pelanggan</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-4">{editId ? 'Edit' : 'Tambah'} Pelanggan</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nama Lengkap *</label>
                <input value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} required
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Alamat</label>
                <textarea value={form.alamat} onChange={e => setForm({...form, alamat: e.target.value})} rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">No HP</label>
                  <input value={form.no_hp} onChange={e => setForm({...form, no_hp: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Paket</label>
                  <select value={form.paket} onChange={e => setForm({...form, paket: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {PAKET.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Harga/Bulan (Rp) *</label>
                  <input type="number" value={form.harga_paket} onChange={e => setForm({...form, harga_paket: e.target.value})} required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Jatuh Tempo (tgl)</label>
                  <input type="number" min="1" max="28" value={form.tanggal_jatuh_tempo} onChange={e => setForm({...form, tanggal_jatuh_tempo: Number(e.target.value)})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                    <option value="suspend">Suspend</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Catatan</label>
                <textarea value={form.catatan} onChange={e => setForm({...form, catatan: e.target.value})} rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
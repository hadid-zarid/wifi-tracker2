import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PlusCircle, Edit2, Trash2, Package, CheckCircle, XCircle, X } from 'lucide-react'

const emptyForm = { nama: '', kecepatan: '', harga: '', deskripsi: '', aktif: true }

export default function Paket() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  
  // State Modal
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('paket').select('*').order('harga', { ascending: true })
    setData(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    
    if (editId) {
      await supabase.from('paket').update(form).eq('id', editId)
    } else {
      await supabase.from('paket').insert([form])
    }
    
    setShowModal(false)
    setForm(emptyForm)
    setEditId(null)
    fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('Hapus paket ini?')) return
    await supabase.from('paket').delete().eq('id', id)
    fetchData()
  }

  function openEdit(p) {
    setForm({ 
      nama: p.nama, 
      kecepatan: p.kecepatan, 
      harga: p.harga, 
      deskripsi: p.deskripsi || '', 
      aktif: p.aktif 
    })
    setEditId(p.id)
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Paket</h1>
          <p className="text-slate-400 text-sm">Kelola daftar layanan dan harga internet</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          <PlusCircle size={16} /> Tambah Paket
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider text-left">
              <tr>
                <th className="px-5 py-4">Nama Paket</th>
                <th className="px-5 py-4">Kecepatan</th>
                <th className="px-5 py-4">Harga / Bulan</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-500">Memuat data...</td></tr>
              ) : data.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <Package size={16} className="text-blue-500" /> {p.nama}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{p.deskripsi || '-'}</div>
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-600">{p.kecepatan}</td>
                  <td className="px-5 py-4 font-bold text-blue-600">Rp {Number(p.harga).toLocaleString('id-ID')}</td>
                  <td className="px-5 py-4">
                    <span className={`flex items-center gap-1 w-fit px-2.5 py-1 rounded-full text-xs font-semibold ${
                      p.aktif ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {p.aktif ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {p.aktif ? 'AKTIF' : 'TIDAK AKTIF'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-yellow-50 text-yellow-600 rounded-lg transition-colors" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors" title="Hapus">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && data.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p>Belum ada paket internet yang dibuat.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL FORM PAKET */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-800 mb-4">{editId ? 'Edit Paket' : 'Tambah Paket Baru'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nama Paket *</label>
                <input required type="text" value={form.nama} onChange={e => setForm({...form, nama: e.target.value})}
                  placeholder="Contoh: Paket Keluarga"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Kecepatan *</label>
                  <input required type="text" value={form.kecepatan} onChange={e => setForm({...form, kecepatan: e.target.value})}
                    placeholder="Contoh: 20 Mbps"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Harga (Rp) *</label>
                  <input required type="number" value={form.harga} onChange={e => setForm({...form, harga: e.target.value})}
                    placeholder="150000"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Deskripsi</label>
                <textarea rows="2" value={form.deskripsi} onChange={e => setForm({...form, deskripsi: e.target.value})}
                  placeholder="Cocok untuk 3-5 perangkat..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="aktif" checked={form.aktif} onChange={e => setForm({...form, aktif: e.target.checked})} 
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                <label htmlFor="aktif" className="text-sm text-slate-700 font-medium">Paket Aktif (Bisa dipilih saat tambah pelanggan)</label>
              </div>

              <button type="submit" disabled={loading}
                className="w-full mt-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                {loading ? 'Menyimpan...' : 'Simpan Paket'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Plus, Phone, MapPin, Calendar, Wifi } from 'lucide-react'
import TombolKwitansi from '../components/Kwitansi'

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const statusColor = { lunas: 'bg-green-50 text-green-700', belum_bayar: 'bg-red-50 text-red-600', terlambat: 'bg-yellow-50 text-yellow-700' }

export default function DetailPelanggan() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pelanggan, setPelanggan] = useState(null)
  const [pembayaran, setPembayaran] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    bulan: new Date().getMonth() + 1,
    tahun: new Date().getFullYear(),
    jumlah: '',
    tanggal_bayar: new Date().toISOString().split('T')[0],
    status: 'lunas',
    metode_bayar: 'Cash',
    keterangan: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    const [{ data: p }, { data: pm }] = await Promise.all([
      supabase.from('pelanggan').select('*').eq('id', id).single(),
      supabase.from('pembayaran').select('*').eq('pelanggan_id', id).order('tahun', { ascending: false }).order('bulan', { ascending: false })
    ])
    setPelanggan(p)
    setPembayaran(pm || [])
    if (p) setForm(f => ({ ...f, jumlah: p.harga_paket }))
  }

  async function handleTambayar(e) {
    e.preventDefault()
    setLoading(true)
    await supabase.from('pembayaran').insert({ ...form, pelanggan_id: id })
    await fetchData()
    setShowModal(false)
    setLoading(false)
  }

  const totalBayar = pembayaran.filter(p => p.status === 'lunas').reduce((s, p) => s + p.jumlah, 0)

  if (!pelanggan) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/pelanggan')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{pelanggan.nama}</h1>
          <p className="text-slate-400 text-sm">Detail pelanggan & riwayat pembayaran</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl"><Wifi size={20} className="text-blue-600" /></div>
          <div>
            <p className="text-xs text-slate-400">Paket</p>
            <p className="font-semibold text-slate-800">{pelanggan.paket}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-green-50 p-3 rounded-xl"><Calendar size={20} className="text-green-600" /></div>
          <div>
            <p className="text-xs text-slate-400">Jatuh Tempo</p>
            <p className="font-semibold text-slate-800">Tanggal {pelanggan.tanggal_jatuh_tempo}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-yellow-50 p-3 rounded-xl"><Phone size={20} className="text-yellow-600" /></div>
          <div>
            <p className="text-xs text-slate-400">Total Dibayar</p>
            <p className="font-semibold text-slate-800">Rp {totalBayar.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          <h3 className="font-semibold text-slate-700">Info Pelanggan</h3>
          {[
            ['No HP', pelanggan.no_hp],
            ['Email', pelanggan.email],
            ['Harga Paket', `Rp ${Number(pelanggan.harga_paket).toLocaleString('id-ID')}/bulan`],
            ['Status', pelanggan.status],
            ['Tgl Daftar', pelanggan.tanggal_daftar],
            ['Catatan', pelanggan.catatan],
          ].map(([k, v]) => v ? (
            <div key={k} className="flex justify-between text-sm border-b border-slate-50 pb-2">
              <span className="text-slate-400">{k}</span>
              <span className="text-slate-700 font-medium capitalize text-right max-w-[60%]">{v}</span>
            </div>
          ) : null)}
          {pelanggan.alamat && (
            <div className="flex gap-2 text-sm pt-1">
              <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
              <span className="text-slate-600">{pelanggan.alamat}</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Riwayat Pembayaran</h3>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
              <Plus size={13} /> Tambah
            </button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {pembayaran.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">Belum ada riwayat pembayaran</p>
            ) : pembayaran.map(p => (
  <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 text-sm">
    <div>
      <p className="font-medium text-slate-700">{BULAN[p.bulan - 1]} {p.tahun}</p>
      <p className="text-slate-400 text-xs">{p.metode_bayar} · {p.kwitansi_no}</p>
    </div>
    <div className="flex items-center gap-2">
      <div className="text-right">
        <p className="text-slate-700 font-medium">Rp {Number(p.jumlah).toLocaleString('id-ID')}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[p.status]}`}>
          {p.status.replace('_', ' ')}
        </span>
      </div>
      <TombolKwitansi pembayaran={p} pelanggan={pelanggan} />
    </div>
  </div>
))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Tambah Pembayaran</h2>
            <form onSubmit={handleTambayar} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Bulan</label>
                  <select value={form.bulan} onChange={e => setForm({...form, bulan: Number(e.target.value)})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {BULAN.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tahun</label>
                  <input type="number" value={form.tahun} onChange={e => setForm({...form, tahun: Number(e.target.value)})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Jumlah (Rp) *</label>
                <input type="number" value={form.jumlah} onChange={e => setForm({...form, jumlah: e.target.value})} required
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal Bayar</label>
                <input type="date" value={form.tanggal_bayar} onChange={e => setForm({...form, tanggal_bayar: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="lunas">Lunas</option>
                    <option value="belum_bayar">Belum Bayar</option>
                    <option value="terlambat">Terlambat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Metode</label>
                  <select value={form.metode_bayar} onChange={e => setForm({...form, metode_bayar: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {['Cash','Transfer','QRIS','GoPay','OVO','Dana','Lainnya'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Keterangan</label>
                <input value={form.keterangan} onChange={e => setForm({...form, keterangan: e.target.value})}
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
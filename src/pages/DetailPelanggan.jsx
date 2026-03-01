import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, User, Phone, MapPin, Calendar, CheckCircle, XCircle, Clock, CreditCard } from 'lucide-react'

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export default function DetailPelanggan() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [pelanggan, setPelanggan] = useState(null)
  const [riwayat, setRiwayat] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDetail()
  }, [id])

  async function fetchDetail() {
    setLoading(true)
    
    // 1. Ambil data profil pelanggan
    const { data: dataPelanggan } = await supabase
      .from('pelanggan')
      .select('*')
      .eq('id', id)
      .single()
      
    // 2. Ambil riwayat pembayaran pelanggan tersebut
    const { data: dataRiwayat } = await supabase
      .from('pembayaran')
      .select('*')
      .eq('pelanggan_id', id)
      .order('tahun', { ascending: false })
      .order('bulan', { ascending: false })

    setPelanggan(dataPelanggan)
    setRiwayat(dataRiwayat || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!pelanggan) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 font-medium">Pelanggan tidak ditemukan!</p>
        <button onClick={() => navigate('/pelanggan')} className="mt-4 text-blue-600 hover:underline">
          Kembali ke Daftar Pelanggan
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Tombol Kembali */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/pelanggan')} 
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Detail Pelanggan</h1>
          <p className="text-slate-400 text-sm">Profil lengkap dan riwayat tagihan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KARTU PROFIL PELANGGAN */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-fit">
          <div className="flex flex-col items-center text-center border-b border-slate-100 pb-6 mb-6">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <User size={32} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">{pelanggan.nama}</h2>
            <p className="text-slate-500 text-sm mb-3">{pelanggan.paket}</p>
            <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
              pelanggan.status === 'aktif' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
              {pelanggan.status === 'aktif' ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {pelanggan.status.toUpperCase()}
            </span>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs mb-1">Nomor HP / WhatsApp</p>
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <Phone size={16} className="text-slate-400" /> 
                {pelanggan.no_hp || '-'}
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Alamat Lengkap</p>
              <div className="flex items-start gap-2 text-slate-700 font-medium">
                <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" /> 
                <span className="leading-snug">{pelanggan.alamat || '-'}</span>
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Harga Paket & Jatuh Tempo</p>
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <CreditCard size={16} className="text-slate-400" /> 
                Rp {Number(pelanggan.harga_paket).toLocaleString('id-ID')} (Tgl {pelanggan.tanggal_jatuh_tempo})
              </div>
            </div>
            {pelanggan.catatan && (
              <div className="p-3 bg-slate-50 rounded-xl mt-4">
                <p className="text-slate-500 text-xs mb-1 font-medium">Catatan Khusus:</p>
                <p className="text-slate-700 text-sm">{pelanggan.catatan}</p>
              </div>
            )}
          </div>
        </div>

        {/* TABEL RIWAYAT PEMBAYARAN */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Clock size={18} className="text-blue-600" /> Riwayat Pembayaran
            </h3>
            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">
              {riwayat.length} Tagihan
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs font-semibold uppercase tracking-wider text-left border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4">Bulan & Tahun</th>
                  <th className="px-5 py-4">Nominal</th>
                  <th className="px-5 py-4">Tanggal Bayar</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riwayat.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {BULAN[r.bulan - 1]} {r.tahun}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      Rp {Number(r.jumlah).toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {r.tanggal_bayar ? new Date(r.tanggal_bayar).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        r.status === 'lunas' ? 'bg-green-50 text-green-700' : 
                        r.status === 'terlambat' ? 'bg-yellow-50 text-yellow-700' : 
                        'bg-red-50 text-red-600'
                      }`}>
                        {r.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {riwayat.length === 0 && (
              <div className="text-center py-16 text-slate-400 flex flex-col items-center">
                <CreditCard size={40} className="mb-3 opacity-20" />
                <p>Belum ada riwayat tagihan/pembayaran.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
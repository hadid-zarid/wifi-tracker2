import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatCard from '../components/StatCard'
import { 
  CheckCircle, TrendingUp, TrendingDown, AlertCircle, 
  AlertTriangle, Wallet, Calendar, Map, Users, Info 
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie } from 'recharts'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

const BULAN_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

export default function Dashboard() {
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())
  
  const [stats, setStats] = useState({ pendapatan: 0, pengeluaran: 0, labaBersih: 0, tiketOpen: 0, totalPelanggan: 0 })
  const [chartData, setChartData] = useState([])
  const [wilayahData, setWilayahData] = useState([])
  const [belumBayar, setBelumBayar] = useState([])
  const [komplainAktif, setKomplainAktif] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [filterBulan, filterTahun])

  async function fetchData() {
    setLoading(true)
    
    const tglAwalTahun = `${filterTahun}-01-01`
    const tglAkhirTahun = `${filterTahun}-12-31`

    const [
      { data: pembayaranTahun }, 
      { data: pengeluaranTahun }, 
      { data: belum },
      { data: komplain },
      { data: pelanggan }
    ] = await Promise.all([
      supabase.from('pembayaran').select('*').eq('tahun', filterTahun).eq('status', 'lunas'),
      supabase.from('pengeluaran').select('*').gte('tanggal', tglAwalTahun).lte('tanggal', tglAkhirTahun),
      supabase.from('pembayaran').select('*, pelanggan(nama, no_hp, wilayah)').eq('bulan', filterBulan).eq('tahun', filterTahun).eq('status', 'belum_bayar'),
      supabase.from('komplain').select('*, pelanggan(nama)').in('status', ['open', 'proses']).order('created_at', { ascending: false }),
      supabase.from('pelanggan').select('wilayah, status')
    ])

    // 1. Kalkulasi Statistik Bulanan
    const pendapatanBulan = pembayaranTahun?.filter(p => p.bulan === filterBulan).reduce((sum, p) => sum + p.jumlah, 0) || 0
    const prefixBulan = `${filterTahun}-${String(filterBulan).padStart(2, '0')}`
    const pengeluaranBulan = pengeluaranTahun?.filter(p => p.tanggal.startsWith(prefixBulan)).reduce((sum, p) => sum + p.jumlah, 0) || 0
    
    // 2. Kalkulasi Wilayah (Derofiza & Mustamindo)
    const counts = pelanggan?.reduce((acc, curr) => {
      const w = curr.wilayah || 'Lainnya'
      acc[w] = (acc[w] || 0) + 1
      return acc
    }, {}) || {}
    
    const formattedWilayah = Object.keys(counts).map(key => ({ name: key, value: counts[key] }))

    // 3. Data Grafik Tahunan
    const grouped = MONTHS_SHORT.map((m, i) => {
      const bIdx = i + 1
      const pref = `${filterTahun}-${String(bIdx).padStart(2, '0')}`
      return {
        bulan: m,
        Pendapatan: pembayaranTahun?.filter(p => p.bulan === bIdx).reduce((s, p) => s + p.jumlah, 0) || 0,
        Pengeluaran: pengeluaranTahun?.filter(p => p.tanggal.startsWith(pref)).reduce((s, p) => s + p.jumlah, 0) || 0,
        isCurrent: bIdx === filterBulan
      }
    })

    setStats({ 
      pendapatan: pendapatanBulan, 
      pengeluaran: pengeluaranBulan, 
      labaBersih: pendapatanBulan - pengeluaranBulan, 
      tiketOpen: komplain?.filter(k => k.status === 'open').length || 0,
      totalPelanggan: pelanggan?.length || 0
    })
    setChartData(grouped)
    setWilayahData(formattedWilayah)
    setBelumBayar(belum || [])
    setKomplainAktif(komplain || [])
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* HEADER & FILTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Utama</h1>
          <p className="text-slate-400 text-sm">Periode Laporan: {BULAN_FULL[filterBulan-1]} {filterTahun}</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <Calendar size={16} className="text-slate-400 ml-2" />
          <select 
            value={filterBulan} 
            onChange={e => setFilterBulan(Number(e.target.value))}
            className="text-sm font-medium border-none focus:ring-0 cursor-pointer bg-transparent outline-none"
          >
            {BULAN_FULL.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
          </select>
          <div className="h-4 w-px bg-slate-200 mx-1"></div>
          <input 
            type="number" 
            value={filterTahun} 
            onChange={e => setFilterTahun(Number(e.target.value))}
            className="w-20 text-sm font-medium border-none focus:ring-0 bg-transparent outline-none"
          />
        </div>
      </div>

      {/* STATCARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pemasukan" value={`Rp ${stats.pendapatan.toLocaleString('id-ID')}`} icon={TrendingUp} color="blue" />
        <StatCard title="Pengeluaran" value={`Rp ${stats.pengeluaran.toLocaleString('id-ID')}`} icon={TrendingDown} color="red" />
        <StatCard title="Keuntungan" value={`Rp ${stats.labaBersih.toLocaleString('id-ID')}`} icon={Wallet} color={stats.labaBersih >= 0 ? "green" : "red"} />
        <StatCard title="Tiket Open" value={stats.tiketOpen} icon={AlertTriangle} color={stats.tiketOpen > 0 ? "yellow" : "slate"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* CHART PEMASUKAN VS PENGELUARAN */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-700 mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-500" /> Arus Kas Tahun {filterTahun}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v/1000}k`} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '12px', paddingBottom: '20px' }} />
              <Bar dataKey="Pendapatan" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => <Cell key={`p-${index}`} fill={entry.isCurrent ? '#2563eb' : '#93c5fd'} />)}
              </Bar>
              <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => <Cell key={`e-${index}`} fill={entry.isCurrent ? '#dc2626' : '#fca5a5'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* DISTRIBUSI WILAYAH */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-700 mb-6 flex items-center gap-2">
            <Map size={18} className="text-blue-500" /> Sebaran Wilayah
          </h3>
          <div className="space-y-4">
            {wilayahData.length > 0 ? wilayahData.map((w, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 font-medium">{w.name}</span>
                  <span className="text-slate-800 font-bold">{w.value} Pelanggan</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${(w.value / stats.totalPelanggan) * 100}%` }}
                  ></div>
                </div>
              </div>
            )) : <p className="text-center text-slate-400 text-sm py-10">Data wilayah belum tersedia</p>}
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex gap-2 text-blue-700">
              <Info size={16} className="shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                <strong>Tips:</strong> Mayoritas pelanggan berada di {wilayahData.sort((a,b) => b.value - a.value)[0]?.name || '...'}. 
                Pastikan pemeliharaan rutin dilakukan di area ini.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* KOMPLAIN AKTIF */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <AlertTriangle size={18} className="text-yellow-500" /> Komplain & Gangguan
            </h3>
            <span className="text-xs font-bold text-blue-600">{komplainAktif.length} Tiket</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {komplainAktif.map(k => (
              <div key={k.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-bold text-slate-800 text-sm">{k.pelanggan?.nama}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${k.status === 'open' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    {k.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2">{k.judul}</p>
                <p className="text-[10px] text-slate-400 italic">Dilaporkan: {format(new Date(k.created_at), "d MMM HH:mm", { locale: id })}</p>
              </div>
            ))}
            {komplainAktif.length === 0 && <p className="text-center py-10 text-slate-400 text-sm">Tidak ada komplain aktif</p>}
          </div>
        </div>

        {/* BELUM BAYAR */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" /> Belum Lunas {MONTHS_SHORT[filterBulan-1]}
            </h3>
            <span className="text-xs font-bold text-red-600">{belumBayar.length} Pelanggan</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {belumBayar.map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{p.pelanggan?.nama}</p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1"><MapPin size={10} /> {p.pelanggan?.wilayah || 'Umum'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">Rp {p.jumlah.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">{p.pelanggan?.no_hp}</p>
                </div>
              </div>
            ))}
            {belumBayar.length === 0 && <p className="text-center py-10 text-slate-400 text-sm">Semua tagihan lunas!</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
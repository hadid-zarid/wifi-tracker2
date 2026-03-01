import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatCard from '../components/StatCard'
import { Users, CheckCircle, XCircle, TrendingUp, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, aktif: 0, nonaktif: 0, pendapatan: 0 })
  const [chartData, setChartData] = useState([])
  const [belumBayar, setBelumBayar] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const tahunIni = new Date().getFullYear()
    const bulanIni = new Date().getMonth() + 1

    const [{ data: pelanggan }, { data: pembayaran }, { data: belum }] = await Promise.all([
      supabase.from('pelanggan').select('*'),
      supabase.from('pembayaran').select('*').eq('tahun', tahunIni).eq('status', 'lunas'),
      supabase.from('pembayaran').select('*, pelanggan(nama, no_hp)').eq('bulan', bulanIni).eq('tahun', tahunIni).eq('status', 'belum_bayar'),
    ])

    const aktif = pelanggan?.filter(p => p.status === 'aktif').length || 0
    const pendapatan = pembayaran?.reduce((sum, p) => sum + p.jumlah, 0) || 0
    const grouped = MONTHS.map((m, i) => ({
      bulan: m,
      pendapatan: pembayaran?.filter(p => p.bulan === i + 1).reduce((s, p) => s + p.jumlah, 0) || 0
    }))

    setStats({ total: pelanggan?.length || 0, aktif, nonaktif: (pelanggan?.length || 0) - aktif, pendapatan })
    setChartData(grouped)
    setBelumBayar(belum || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-400 text-sm">{format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Pelanggan" value={stats.total} icon={Users} color="blue" />
        <StatCard title="Aktif" value={stats.aktif} icon={CheckCircle} color="green" />
        <StatCard title="Tidak Aktif" value={stats.nonaktif} icon={XCircle} color="red" />
        <StatCard title="Pendapatan Tahun Ini" value={`Rp ${stats.pendapatan.toLocaleString('id-ID')}`} icon={TrendingUp} color="yellow" sub="Dari pembayaran lunas" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-700 mb-4">Pendapatan Per Bulan</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="bulan" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v/1000}k`} />
              <Tooltip formatter={v => [`Rp ${v.toLocaleString('id-ID')}`, 'Pendapatan']} />
              <Bar dataKey="pendapatan" fill="#3b82f6" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={18} className="text-yellow-500" />
            <h3 className="font-semibold text-slate-700">Belum Bayar Bulan Ini</h3>
          </div>
          {belumBayar.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Semua sudah lunas! 🎉</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-52 overflow-y-auto">
              {belumBayar.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1">
                  <div>
                    <p className="font-medium text-slate-700">{p.pelanggan?.nama}</p>
                    <p className="text-slate-400 text-xs">{p.pelanggan?.no_hp}</p>
                  </div>
                  <span className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded-full">Belum Bayar</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
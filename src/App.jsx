import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pelanggan from './pages/Pelanggan'
import DetailPelanggan from './pages/DetailPelanggan'
import Pembayaran from './pages/Pembayaran'
import Layout from './components/Layout'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-slate-400 text-sm">Memuat...</p>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="pelanggan" element={<Pelanggan />} />
          <Route path="pelanggan/:id" element={<DetailPelanggan />} />
          <Route path="pembayaran" element={<Pembayaran />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
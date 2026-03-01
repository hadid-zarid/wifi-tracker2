import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { LogOut, Bell } from 'lucide-react'

export default function Navbar() {
  const { user } = useAuth()

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-slate-800 font-semibold text-sm">Selamat datang kembali 👋</h2>
        <p className="text-slate-400 text-xs">{user?.email}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <Bell size={18} />
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  )
}
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CreditCard, Wifi } from 'lucide-react'

const menu = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pelanggan', icon: Users, label: 'Pelanggan' },
  { to: '/pembayaran', icon: CreditCard, label: 'Pembayaran' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Wifi size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">WiFi Manager</h1>
            <p className="text-slate-400 text-xs">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menu.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700 text-xs text-slate-500 text-center">
        © 2025 WiFi Manager
      </div>
    </aside>
  )
}
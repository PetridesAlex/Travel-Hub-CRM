import {
  LayoutDashboard, Users, Target, FileText, CalendarCheck,
  Building2, CheckSquare, Mail, Mic, Megaphone, Settings,
  Plane, ScrollText, Receipt,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../constants/enums'
import { useAgency } from '../../hooks/useAgency'

const ICONS = {
  LayoutDashboard, Users, Target, FileText, CalendarCheck,
  Building2, CheckSquare, Mail, Mic, Megaphone, Settings,
  ScrollText, Receipt,
}

export default function Sidebar({ open, onClose }) {
  const { agency } = useAgency()
  const agencyName = agency?.name || 'My Travel Agency'

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-white transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-700 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600">
            <Plane className="h-5 w-5" />
          </div>
          <div>
            <h1 className="truncate text-sm font-bold">{agencyName}</h1>
            <p className="text-xs text-slate-400">Travel CRM</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = ICONS[item.icon]
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-teal-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}

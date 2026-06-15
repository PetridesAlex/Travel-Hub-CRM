import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import ErrorBoundary from '../ErrorBoundary'
import { NAV_ITEMS } from '../../constants/enums'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const currentPage = NAV_ITEMS.find((item) => location.pathname.startsWith(item.path))
  const title = currentPage?.label || 'Dashboard'

  return (
    <div className="flex min-h-screen overflow-x-clip bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-[17.5rem]">
        <Header
          title={title}
          pageIcon={currentPage?.icon}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="min-w-0 flex-1 overflow-x-clip p-3 sm:p-4 lg:p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

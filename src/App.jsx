import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AgencyProvider } from './context/AgencyContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientProfile from './pages/ClientProfile'
import Leads from './pages/Leads'
import Quotations from './pages/Quotations'
import Bookings from './pages/Bookings'
import Invoices from './pages/Invoices'
import Receipts from './pages/Receipts'
import Suppliers from './pages/Suppliers'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import AIEmailAssistant from './pages/AIEmailAssistant'
import VoiceNotes from './pages/VoiceNotes'
import MarketingCampaigns from './pages/MarketingCampaigns'
import Settings from './pages/Settings'
import AIAgents from './pages/ai-workspace/AIAgents'
import AITemplates from './pages/ai-workspace/AITemplates'
import AIGenerator from './pages/ai-workspace/AIGenerator'
import AIHistory from './pages/ai-workspace/AIHistory'
import SetupBanner from './components/SetupBanner'
import SuperAdminRoute from './components/admin/SuperAdminRoute'
import SuperAdminLayout from './components/admin/SuperAdminLayout'
import AdminAgencies from './pages/admin/AdminAgencies'
import AdminAgencyNew from './pages/admin/AdminAgencyNew'
import AdminAgencyEdit from './pages/admin/AdminAgencyEdit'

export default function App() {
  return (
    <AuthProvider>
      <AgencyProvider>
        <SetupBanner />
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientProfile />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/ai-workspace/agents" element={<AIAgents />} />
            <Route path="/ai-workspace/templates" element={<AITemplates />} />
            <Route path="/ai-workspace/generator" element={<AIGenerator />} />
            <Route path="/ai-workspace/history" element={<AIHistory />} />
            <Route path="/ai-email" element={<AIEmailAssistant />} />
            <Route path="/voice-notes" element={<VoiceNotes />} />
            <Route path="/marketing" element={<MarketingCampaigns />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route
            element={
              <SuperAdminRoute>
                <SuperAdminLayout />
              </SuperAdminRoute>
            }
          >
            <Route path="/admin/agencies" element={<AdminAgencies />} />
            <Route path="/admin/agencies/new" element={<AdminAgencyNew />} />
            <Route path="/admin/agencies/:id" element={<AdminAgencyEdit />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </AgencyProvider>
    </AuthProvider>
  )
}

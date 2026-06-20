import { Navigate, Route, Routes } from 'react-router-dom'
import { Rail } from './components/Rail'
import { useAuth } from './context/AuthContext'
import { LoginPage } from './features/auth/LoginPage'
import { DashboardPage } from './features/dashboard/DashboardPage'

function PlaceholderPage({ title, id }: { title: string; id: string }) {
  return (
    <section className="admin active" id={id}>
      <div className="topbar">
        <div className="crumb"><b>{title}</b></div>
        <div className="spacer" />
      </div>
      <div className="page">
        <h1 className="h1">{title}</h1>
        <p className="sub">Coming in a future milestone.</p>
        <div className="alert info">
          <span className="ic">🚧</span>
          <div>This screen will be built in a later milestone. Check <code>plan.md</code> §7 for the schedule.</div>
        </div>
      </div>
    </section>
  )
}

function ProtectedLayout() {
  const { auth } = useAuth()
  if (!auth.isAuthenticated) return <Navigate to="/" replace />
  return (
    <div className="app">
      <Rail />
      <div className="view">
        <Routes>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="flow" element={<PlaceholderPage title="Inspection Status Flow" id="adm-flow" />} />
          <Route path="tasks" element={<PlaceholderPage title="Task Management" id="adm-tasks" />} />
          <Route path="approval" element={<PlaceholderPage title="Approval Queue" id="adm-approval" />} />
          <Route path="verification" element={<PlaceholderPage title="SPV Verification" id="adm-verify" />} />
          <Route path="history" element={<PlaceholderPage title="Change History" id="adm-history" />} />
          <Route path="leveling" element={<PlaceholderPage title="Master SKU Leveling" id="adm-leveling" />} />
          <Route path="generator" element={<PlaceholderPage title="Priority Generator" id="adm-generator" />} />
          <Route path="officer/inbox" element={<PlaceholderPage title="Task Inbox" id="mob-inbox" />} />
          <Route path="officer/stock" element={<PlaceholderPage title="Open Task / Stock" id="mob-stock" />} />
          <Route path="officer/step1" element={<PlaceholderPage title="Inspection · Step 1" id="mob-step1" />} />
          <Route path="officer/step2" element={<PlaceholderPage title="Inspection · Step 2" id="mob-step2" />} />
          <Route path="officer/result" element={<PlaceholderPage title="Result & Decision" id="mob-result" />} />
          <Route path="officer/receipt" element={<PlaceholderPage title="Quality Receipt" id="mob-receipt" />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export function App() {
  const { auth } = useAuth()
  const defaultPath = auth.user?.role === 'officer' ? '/app/officer/inbox' : '/app/dashboard'
  return (
    <Routes>
      <Route
        path="/"
        element={auth.isAuthenticated ? <Navigate to={defaultPath} replace /> : <LoginPage />}
      />
      <Route path="/app/*" element={<ProtectedLayout />} />
    </Routes>
  )
}

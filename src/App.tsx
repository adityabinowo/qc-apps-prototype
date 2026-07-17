import { Navigate, Route, Routes } from 'react-router-dom'
import { Rail } from './components/Rail'
import { useAuth } from './context/AuthContext'
import { LoginPage } from './features/auth/LoginPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { StatusFlowPage } from './features/statusFlow/StatusFlowPage'
import { TaskManagementPage } from './features/tasks/TaskManagementPage'
import { TaskDetailPage } from './features/tasks/TaskDetailPage'
import { ApprovalQueuePage } from './features/approval/ApprovalQueuePage'
import { SpvVerificationPage } from './features/verification/SpvVerificationPage'
import { ChangeHistoryPage } from './features/history/ChangeHistoryPage'
import { MasterLevelingPage } from './features/leveling/MasterLevelingPage'
import { PriorityGeneratorPage } from './features/generator/PriorityGeneratorPage'
import { SavedPriorityListPage } from './features/priorityList/SavedPriorityListPage'
import { TaskGeneratorPage } from './features/taskGenerator/TaskGeneratorPage'
import { InboxPage } from './features/officer/InboxPage'
import { StockPage } from './features/officer/StockPage'
import { InspectionStep1Page } from './features/officer/InspectionStep1Page'
import { InspectionStep2Page } from './features/officer/InspectionStep2Page'
import { ResultPage } from './features/officer/ResultPage'
import { ReceiptPage } from './features/officer/ReceiptPage'
import { DonePage } from './features/officer/DonePage'

function ProtectedLayout() {
  const { auth } = useAuth()
  if (!auth.isAuthenticated) return <Navigate to="/" replace />
  return (
    <div className="app">
      <Rail />
      <div className="view">
        <Routes>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="flow" element={<StatusFlowPage />} />
          <Route path="tasks" element={<TaskManagementPage />} />
          <Route path="tasks/:id" element={<TaskDetailPage />} />
          <Route path="approval" element={<ApprovalQueuePage />} />
          <Route path="verification" element={<SpvVerificationPage />} />
          <Route path="history" element={<ChangeHistoryPage />} />
          <Route path="leveling" element={<MasterLevelingPage />} />
          <Route path="generator" element={<PriorityGeneratorPage />} />
          <Route path="priority-list" element={<SavedPriorityListPage />} />
          <Route path="task-generator" element={<TaskGeneratorPage />} />
          <Route path="officer/inbox" element={<InboxPage />} />
          <Route path="officer/stock" element={<StockPage />} />
          <Route path="officer/step1" element={<InspectionStep1Page />} />
          <Route path="officer/step2" element={<InspectionStep2Page />} />
          <Route path="officer/result" element={<ResultPage />} />
          <Route path="officer/receipt" element={<ReceiptPage />} />
          <Route path="officer/done/:taskId" element={<DonePage />} />
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

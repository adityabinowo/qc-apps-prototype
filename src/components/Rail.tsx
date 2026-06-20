import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ADMIN_NAV = [
  { to: '/app/dashboard', icon: '📊', label: 'Monitoring Dashboard' },
  { to: '/app/flow', icon: '🔀', label: 'Inspection Status Flow' },
  { to: '/app/tasks', icon: '🗂️', label: 'Task Management' },
  { to: '/app/approval', icon: '✅', label: 'Approval Queue' },
  { to: '/app/verification', icon: '🔍', label: 'SPV Verification' },
  { to: '/app/history', icon: '📜', label: 'Change History' },
]

const PHASE2_NAV = [
  { to: '/app/leveling', icon: '🏷️', label: 'Master SKU Leveling' },
  { to: '/app/generator', icon: '⚙️', label: 'Priority Generator' },
]

const OFFICER_NAV = [
  { to: '/app/officer/inbox', icon: '📥', label: 'Task Inbox' },
  { to: '/app/officer/stock', icon: '📦', label: 'Open Task / Stock' },
  { to: '/app/officer/step1', icon: '🧊', label: 'Inspection · Step 1' },
  { to: '/app/officer/step2', icon: '🔬', label: 'Inspection · Step 2' },
  { to: '/app/officer/result', icon: '🧮', label: 'Result & Decision' },
  { to: '/app/officer/receipt', icon: '🧾', label: 'Quality Receipt' },
]

export function Rail() {
  const { auth, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isOfficer = auth.user?.role === 'officer'

  return (
    <nav className="rail">
      <div className="brand">
        <div className="logo">QC</div>
        <div>
          <b>QC Apps</b>
          <span>MVP Prototype</span>
        </div>
      </div>

      {!isOfficer && (
        <>
          <div className="grp">Web Admin · SPV / PX</div>
          {ADMIN_NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav${isActive ? ' active' : ''}`}
            >
              <span className="ic">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          <div className="grp">Phase 2 · PX Quality</div>
          {PHASE2_NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav${isActive ? ' active' : ''}`}
            >
              <span className="ic">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </>
      )}

      {isOfficer && (
        <>
          <div className="grp">Mobile · QA Officer</div>
          {OFFICER_NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav${isActive ? ' active' : ''}`}
            >
              <span className="ic">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </>
      )}

      <div style={{ marginTop: 'auto', padding: '16px' }}>
        <button
          className="nav"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#AEBBD4', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}
          onClick={handleLogout}
        >
          <span className="ic">🚪</span> Sign Out
        </button>
      </div>
    </nav>
  )
}

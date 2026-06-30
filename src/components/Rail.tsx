import { useState, useEffect } from 'react'
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
  { to: '/app/priority-list', icon: '📋', label: 'Saved Priority List' },
  { to: '/app/task-generator', icon: '🏭', label: 'QC Task Generator' },
]

const OFFICER_NAV = [
  { to: '/app/officer/inbox', icon: '📥', label: 'Task Inbox' },
  { to: '/app/officer/stock', icon: '📦', label: 'Open Task / Stock' },
  { to: '/app/officer/step1', icon: '🧊', label: 'Inspection · Step 1' },
  { to: '/app/officer/step2', icon: '🔬', label: 'Inspection · Step 2' },
  { to: '/app/officer/result', icon: '🧮', label: 'Result & Decision' },
  { to: '/app/officer/receipt', icon: '🧾', label: 'Quality Receipt' },
]

const STORAGE_KEY = 'rail_collapsed'

export function Rail() {
  const { auth, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)) } catch { /* ignore */ }
  }, [collapsed])

  const handleLogout = () => { logout(); navigate('/') }
  const isOfficer = auth.user?.role === 'officer'

  return (
    <nav className={`rail${collapsed ? ' collapsed' : ''}`}>
      <div className="brand">
        <div className="logo">QC</div>
        {!collapsed && (
          <div>
            <b>QC Apps</b>
            <span>MVP Prototype</span>
          </div>
        )}
        <button
          className="rail-toggle"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ marginLeft: collapsed ? undefined : 'auto' }}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {!isOfficer && (
        <>
          {!collapsed && <div className="grp">Web Admin · SPV / PX</div>}
          {ADMIN_NAV.map(item => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav${isActive ? ' active' : ''}`} title={item.label}>
              <span className="ic">{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}
          {!collapsed && <div className="grp">QC Task Generator</div>}
          {PHASE2_NAV.map(item => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav${isActive ? ' active' : ''}`} title={item.label}>
              <span className="ic">{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}
        </>
      )}

      {isOfficer && (
        <>
          {!collapsed && <div className="grp">Mobile · QA Officer</div>}
          {OFFICER_NAV.map(item => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav${isActive ? ' active' : ''}`} title={item.label}>
              <span className="ic">{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}
        </>
      )}

      <div style={{ marginTop: 'auto', padding: collapsed ? '16px 0' : '16px' }}>
        <button
          className="nav"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#AEBBD4', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '9px' : '9px 16px' }}
          onClick={handleLogout}
          title="Sign Out"
        >
          <span className="ic">🚪</span>{!collapsed && ' Sign Out'}
        </button>
      </div>
    </nav>
  )
}

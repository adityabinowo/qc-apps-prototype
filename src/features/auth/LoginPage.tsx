import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import type { HubInterface, RoleType, UserInterface } from '../../lib/types'

// Static mock users + hubs — no Supabase call needed at login for v1 mock auth
const MOCK_HUBS: HubInterface[] = [
  { id: 'hub-kemang', name: 'Hub Kemang', location: 'South Jakarta' },
  { id: 'hub-tebet', name: 'Hub Tebet', location: 'South Jakarta' },
  { id: 'hub-pancoran', name: 'Hub Pancoran', location: 'South Jakarta' },
]

const MOCK_USERS: UserInterface[] = [
  { id: 'user-spv-1', name: 'Rina N', email: 'spv.quality@astronauts.id', role: 'spv', hub_id: 'hub-kemang' },
  { id: 'user-px-1', name: 'Budi K', email: 'px.quality@astronauts.id', role: 'px', hub_id: 'hub-kemang' },
  { id: 'user-officer-1', name: 'Dani A', email: 'officer1@astronauts.id', role: 'officer', hub_id: 'hub-kemang' },
  { id: 'user-officer-2', name: 'Sari W', email: 'officer2@astronauts.id', role: 'officer', hub_id: 'hub-tebet' },
]

const ROLE_LABELS: Record<RoleType, string> = {
  spv: 'SPV QA',
  px: 'PX Quality',
  officer: 'QA Officer',
}

export function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<RoleType>('spv')
  const [selectedUserId, setSelectedUserId] = useState('user-spv-1')
  const [selectedHubId, setSelectedHubId] = useState('hub-kemang')
  const { login } = useAuth()

  const usersForRole = MOCK_USERS.filter(u => u.role === selectedRole)

  const handleRoleChange = (role: RoleType) => {
    setSelectedRole(role)
    const first = MOCK_USERS.find(u => u.role === role)
    if (first) setSelectedUserId(first.id)
  }

  const handleSignIn = () => {
    const user = MOCK_USERS.find(u => u.id === selectedUserId)
    const hub = MOCK_HUBS.find(h => h.id === selectedHubId)
    if (!user || !hub) return
    login(user, hub)
  }

  return (
    <section className="admin active" id="adm-login">
      <div className="topbar">
        <div className="crumb">QC Apps Admin</div>
        <div className="spacer" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 58px)', padding: 24 }}>
        <div className="card" style={{ width: 400, padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--main)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>QC</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--textV2)' }}>QC Apps Admin</div>
              <div className="note">Astro Quality Control</div>
            </div>
          </div>

          <p className="sub" style={{ margin: '14px 0 20px' }}>
            Select your role and hub to enter. Auth is mocked for this prototype — no real password required.
          </p>

          <div className="field">
            <label>Role <span className="req">*</span></label>
            <select
              className="inp fullw"
              value={selectedRole}
              onChange={e => handleRoleChange(e.target.value as RoleType)}
            >
              {(Object.keys(ROLE_LABELS) as RoleType[]).map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>User <span className="req">*</span></label>
            <select
              className="inp fullw"
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
            >
              {usersForRole.map(u => (
                <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Hub <span className="req">*</span></label>
            <select
              className="inp fullw"
              value={selectedHubId}
              onChange={e => setSelectedHubId(e.target.value)}
            >
              {MOCK_HUBS.map(h => (
                <option key={h.id} value={h.id}>{h.name} — {h.location}</option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-primary lg fullw"
            style={{ justifyContent: 'center', marginTop: 6 }}
            onClick={handleSignIn}
          >
            Sign In
          </button>

          <p className="note" style={{ textAlign: 'center', marginTop: 16 }}>
            Auth is mocked · role + hub stored in app state · <b>PRD Auth #1–3</b>
          </p>
        </div>
      </div>
    </section>
  )
}

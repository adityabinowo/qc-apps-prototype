import { useAuth } from '../context/AuthContext'

interface TopbarProps {
  title: string
  breadcrumb?: string
}

export function Topbar({ title, breadcrumb }: TopbarProps) {
  const { auth } = useAuth()
  const initials = auth.user?.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  return (
    <div className="topbar">
      <div className="crumb">
        {breadcrumb && <>{breadcrumb} · </>}
        <b>{title}</b>
      </div>
      <div className="spacer" />
      {auth.hub && <div className="hubpill">{auth.hub.name}</div>}
      {auth.user && (
        <div className="who">
          <div className="av">{initials}</div>
          {auth.user.name} · {auth.user.role.toUpperCase()}
        </div>
      )}
    </div>
  )
}

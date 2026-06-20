interface StatusChipProps {
  label: string
  variant: 'green' | 'yellow' | 'red' | 'blue' | 'orange' | 'grey'
  dot?: boolean
}

export function StatusChip({ label, variant, dot }: StatusChipProps) {
  return (
    <span className={`lab ${variant}`}>
      {dot && <i className="dot" style={{ background: 'currentColor' }} />}
      {label}
    </span>
  )
}

export function taskStatusChip(status: string) {
  const map: Record<string, StatusChipProps['variant']> = {
    Pending: 'grey',
    'In Progress': 'blue',
    Done: 'green',
    Overdue: 'red',
  }
  return <StatusChip label={status} variant={map[status] ?? 'grey'} />
}

export function priorityChip(priority: string) {
  const map: Record<string, StatusChipProps['variant']> = {
    High: 'red',
    Medium: 'orange',
    Low: 'grey',
  }
  return <StatusChip label={priority} variant={map[priority] ?? 'grey'} />
}

export function lifecycleChip(state: string) {
  const map: Record<string, StatusChipProps['variant']> = {
    SUBMITTED: 'blue',
    COMPLETED: 'green',
    PENDING_SORT: 'orange',
    PENDING_APPROVAL: 'yellow',
    APPROVED: 'blue',
    WMS_WRITTEN: 'green',
    REJECTED: 'red',
    SELECTED: 'grey',
    RE_INSPECTED: 'grey',
  }
  return <StatusChip label={state.replace(/_/g, ' ')} variant={map[state] ?? 'grey'} />
}

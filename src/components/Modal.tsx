import { type ReactNode, useEffect } from 'react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <div className={`overlay${open ? ' open' : ''}`} onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <header>
          <h3>{title}</h3>
          <button className="x" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="bd">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  )
}

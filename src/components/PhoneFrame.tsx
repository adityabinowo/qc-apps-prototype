import { type ReactNode } from 'react'

interface PhoneFrameProps {
  children: ReactNode
  caption?: string
}

export function PhoneFrame({ children, caption }: PhoneFrameProps) {
  return (
    <div>
      <div className="phone">
        <div className="notch" />
        <div className="scr">{children}</div>
      </div>
      {caption && <p className="screencap">{caption}</p>}
    </div>
  )
}

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const ICONS = [
  <svg key="citrus"   viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/></svg>,
  <svg key="grapes"   viewBox="0 0 24 24" {...S}><path d="M12 6V4"/><circle cx="9" cy="10" r="2"/><circle cx="13" cy="10" r="2"/><circle cx="11" cy="13.5" r="2"/><circle cx="15" cy="13.5" r="2"/><circle cx="13" cy="17" r="2"/></svg>,
  <svg key="carrot"   viewBox="0 0 24 24" {...S}><path d="M14 9 7 19c-1 1.4 1 3 2.2 2L20 13Z"/><path d="M14 9l2-3M16 9l3-2M13 7l1-3"/></svg>,
  <svg key="broccoli" viewBox="0 0 24 24" {...S}><circle cx="9" cy="9" r="2.6"/><circle cx="14.5" cy="8" r="2.6"/><circle cx="12" cy="12.5" r="2.6"/><path d="M10 14v4h4v-4"/></svg>,
  <svg key="leaf"     viewBox="0 0 24 24" {...S}><path d="M4 20C4 12 10 5 20 4 19 14 13 20 4 20Z"/><path d="M11 13 4 20"/></svg>,
  <svg key="fish"     viewBox="0 0 24 24" {...S}><path d="M3 12c3-4 9-5 13-2 2 1.3 3 2 5 2-1 2-3 2-5 2-4 3-10 2-13-4Z"/><path d="M21 12c-2 0-3 1-4 2"/></svg>,
  <svg key="steak"    viewBox="0 0 24 24" {...S}><path d="M5 10c0-3 4-5 9-5s8 2 8 5-3 6-9 6c-3 0-5 0-6-2-1-1.4-2-2.5-2-4Z"/><circle cx="9" cy="11" r="1.6"/></svg>,
  <svg key="egg"      viewBox="0 0 24 24" {...S}><path d="M12 3c4 0 6 6 6 10a6 6 0 1 1-12 0c0-4 2-10 6-10Z"/></svg>,
  <svg key="cherry"   viewBox="0 0 24 24" {...S}><circle cx="8" cy="16" r="3"/><circle cx="16" cy="16" r="3"/><path d="M8 13c1-5 4-7 8-7M16 13c0-4 0-6 0-7"/></svg>,
]

export function FoodLoader({ caption, activeStep, totalSteps, flavor }: {
  caption: string
  activeStep: number
  totalSteps: number
  flavor?: string
}) {
  const lit = Math.max(1, Math.ceil(((activeStep + 1) / totalSteps) * ICONS.length))
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="food-row">
        {ICONS.map((ic, i) => (
          <span key={i} className={`food-ic ${i < lit ? 'lit' : 'dim'}`} style={{ animationDelay: `${i * 60}ms` }}>
            {ic}
          </span>
        ))}
      </div>
      <div style={{ fontWeight: 800, fontSize: 15, marginTop: 16 }}>{caption}</div>
      {flavor && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{flavor}</div>}
    </div>
  )
}

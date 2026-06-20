import { Topbar } from '../../components/Topbar'

const FLOW_SVG = `<svg viewBox="0 0 1120 580" xmlns="http://www.w3.org/2000/svg" style="font-family:'Nunito Sans',sans-serif;">
  <defs>
    <marker id="arr" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#8D96AA"/></marker>
    <marker id="arrP" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#6847BB"/></marker>
  </defs>

  <text x="20" y="26" font-size="11" font-weight="800" fill="#2455B0" letter-spacing="1">MAIN PIPELINE · per inspection</text>

  <path d="M152,158 L188,158" fill="none" stroke="#8D96AA" stroke-width="1.6" marker-end="url(#arr)"/>
  <path d="M340,150 L364,150 L364,70 L388,70" fill="none" stroke="#8D96AA" stroke-width="1.6" marker-end="url(#arr)"/>
  <path d="M340,158 L388,158" fill="none" stroke="#8D96AA" stroke-width="1.6" marker-end="url(#arr)"/>
  <path d="M340,166 L364,166 L364,250 L388,250" fill="none" stroke="#8D96AA" stroke-width="1.6" marker-end="url(#arr)"/>
  <path d="M548,70 L596,70" fill="none" stroke="#8D96AA" stroke-width="1.6" marker-end="url(#arr)"/>
  <path d="M548,158 L596,158" fill="none" stroke="#8D96AA" stroke-width="1.6" marker-end="url(#arr)"/>
  <path d="M756,158 L788,158" fill="none" stroke="#8D96AA" stroke-width="1.6" marker-end="url(#arr)"/>
  <path d="M548,250 L792,250 L792,188" fill="none" stroke="#8D96AA" stroke-width="1.6" marker-end="url(#arr)"/>
  <path d="M940,150 L962,150 L962,120 L984,120" fill="none" stroke="#8D96AA" stroke-width="1.6" marker-end="url(#arr)"/>
  <path d="M940,166 L962,166 L962,210 L984,210" fill="none" stroke="#8D96AA" stroke-width="1.6" marker-end="url(#arr)"/>

  <rect x="20" y="130" width="132" height="56" rx="8" fill="#EFF3F9" stroke="#cfe0f5"/>
  <text x="86" y="153" text-anchor="middle" font-size="12.5" font-weight="800" fill="#2455B0">SUBMITTED</text>
  <text x="86" y="170" text-anchor="middle" font-size="10" fill="#778092">officer submits SKU</text>

  <rect x="188" y="130" width="152" height="56" rx="8" fill="#fff" stroke="#e4eaf3"/>
  <text x="264" y="153" text-anchor="middle" font-size="12" font-weight="800" fill="#40464E">AUTO % NON-CONF</text>
  <text x="264" y="170" text-anchor="middle" font-size="10" fill="#778092">+ decision matrix</text>

  <rect x="388" y="48" width="160" height="46" rx="8" fill="#E7F5E6" stroke="#bce7bd"/>
  <text x="468" y="68" text-anchor="middle" font-size="11.5" font-weight="800" fill="#098A4E">Accepted · 0–5%</text>
  <text x="468" y="84" text-anchor="middle" font-size="9.5" fill="#098A4E">no status change</text>
  <rect x="388" y="135" width="160" height="46" rx="8" fill="#FFF3E6" stroke="#ffd9bd"/>
  <text x="468" y="155" text-anchor="middle" font-size="11.5" font-weight="800" fill="#FA591D">Cond. Accepted · 6–20%</text>
  <text x="468" y="171" text-anchor="middle" font-size="9.5" fill="#FA591D">needs 1:1 sort first</text>
  <rect x="388" y="227" width="160" height="46" rx="8" fill="#FFEAEF" stroke="#ffc7d2"/>
  <text x="468" y="247" text-anchor="middle" font-size="11.5" font-weight="800" fill="#EC465C">Quarantine All · &gt;20%</text>
  <text x="468" y="263" text-anchor="middle" font-size="9.5" fill="#EC465C">bulk status change</text>

  <rect x="596" y="48" width="190" height="46" rx="8" fill="#E7F5E6" stroke="#bce7bd"/>
  <text x="691" y="68" text-anchor="middle" font-size="12" font-weight="800" fill="#098A4E">COMPLETED</text>
  <text x="691" y="84" text-anchor="middle" font-size="9.5" fill="#098A4E">no WMS write · task closes</text>

  <rect x="596" y="135" width="160" height="46" rx="8" fill="#fff" stroke="#e4eaf3"/>
  <text x="676" y="155" text-anchor="middle" font-size="11.5" font-weight="800" fill="#40464E">SORT 1:1</text>
  <text x="676" y="171" text-anchor="middle" font-size="9.5" fill="#778092">bad units → change</text>

  <rect x="788" y="130" width="152" height="58" rx="8" fill="#FFF0B3" stroke="#ffe08a"/>
  <text x="864" y="153" text-anchor="middle" font-size="12" font-weight="800" fill="#E67800">PENDING APPROVAL</text>
  <text x="864" y="170" text-anchor="middle" font-size="9.5" fill="#E67800">SPV QA gate · SLA</text>

  <rect x="984" y="96" width="124" height="48" rx="8" fill="#2455B0" stroke="#2455B0"/>
  <text x="1046" y="116" text-anchor="middle" font-size="11.5" font-weight="800" fill="#fff">APPROVED</text>
  <text x="1046" y="132" text-anchor="middle" font-size="9.5" fill="#cfe0f5">→ WMS write &lt;5min</text>
  <rect x="984" y="186" width="124" height="46" rx="8" fill="#FFEAEF" stroke="#ffc7d2"/>
  <text x="1046" y="206" text-anchor="middle" font-size="11.5" font-weight="800" fill="#EC465C">REJECTED</text>
  <text x="1046" y="222" text-anchor="middle" font-size="9.5" fill="#EC465C">WMS unchanged</text>

  <line x1="20" y1="330" x2="1100" y2="330" stroke="#e4eaf3" stroke-width="1.4" stroke-dasharray="5 5"/>
  <text x="20" y="356" font-size="11" font-weight="800" fill="#6847BB" letter-spacing="1">VERIFICATION LANE · sampled &amp; asynchronous — audits the officer, does not block the gate</text>

  <path d="M276,300 L276,418" fill="none" stroke="#b9aede" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#arrP)"/>
  <text x="286" y="312" font-size="9.5" fill="#8D96AA">~20% of completed inspections sampled (risk / random)</text>

  <path d="M356,444 L398,444" fill="none" stroke="#8D96AA" stroke-width="1.6" marker-end="url(#arr)"/>
  <path d="M558,444 L582,444 L582,414 L606,414" fill="none" stroke="#8D96AA" stroke-width="1.6" marker-end="url(#arr)"/>
  <path d="M558,444 L582,444 L582,484 L606,484" fill="none" stroke="#8D96AA" stroke-width="1.6" marker-end="url(#arr)"/>
  <path d="M806,484 L864,484 L864,190" fill="none" stroke="#6847BB" stroke-width="1.7" stroke-dasharray="5 4" marker-end="url(#arrP)"/>
  <text x="872" y="300" font-size="9.5" font-weight="700" fill="#6847BB">mismatch creates a</text>
  <text x="872" y="313" font-size="9.5" font-weight="700" fill="#6847BB">new status change →</text>

  <rect x="196" y="418" width="160" height="52" rx="8" fill="#F0EDF8" stroke="#d8cef0"/>
  <text x="276" y="440" text-anchor="middle" font-size="11.5" font-weight="800" fill="#6847BB">SELECTED</text>
  <text x="276" y="456" text-anchor="middle" font-size="9.5" fill="#6847BB">verification ticket</text>
  <rect x="398" y="418" width="160" height="52" rx="8" fill="#fff" stroke="#e4eaf3"/>
  <text x="478" y="440" text-anchor="middle" font-size="11.5" font-weight="800" fill="#40464E">RE-INSPECTION</text>
  <text x="478" y="456" text-anchor="middle" font-size="9.5" fill="#778092">SPV re-checks sample</text>
  <rect x="606" y="391" width="196" height="46" rx="8" fill="#E7F5E6" stroke="#bce7bd"/>
  <text x="704" y="411" text-anchor="middle" font-size="11.5" font-weight="800" fill="#098A4E">MATCH</text>
  <text x="704" y="427" text-anchor="middle" font-size="9.5" fill="#098A4E">close · update officer compliance %</text>
  <rect x="606" y="461" width="196" height="46" rx="8" fill="#FFEAEF" stroke="#ffc7d2"/>
  <text x="704" y="481" text-anchor="middle" font-size="11.5" font-weight="800" fill="#EC465C">MISMATCH</text>
  <text x="704" y="497" text-anchor="middle" font-size="9.5" fill="#EC465C">quarantine + wastage record</text>
</svg>
<div class="flowlegend">
  <span><i style="background:#EFF3F9;"></i>Entry</span>
  <span><i style="background:#E7F5E6;"></i>Terminal · no further gate</span>
  <span><i style="background:#FFF3E6;"></i>Needs operational step</span>
  <span><i style="background:#FFF0B3;"></i>Approval gate (only WMS write point)</span>
  <span><i style="background:#2455B0;"></i>WMS write</span>
  <span><i style="background:#FFEAEF;"></i>Rejected / quarantine</span>
  <span><i style="background:#F0EDF8;"></i>Verification (audit lane)</span>
</div>`

export function StatusFlowPage() {
  return (
    <section className="admin active" id="adm-flow">
      <Topbar title="Inspection Status Flow" />
      <div className="page">
        <h1 className="h1">Inspection Status Flow</h1>
        <p className="sub">
          The lifecycle every inspection moves through. Approval and Verification are different lanes, not alternatives: the pipeline branches first on <b>"did this change the status vs WMS?"</b>, and Verification is a sampled audit that can inject new changes back into the approval gate.
        </p>

        <div className="alert info">
          <span className="ic">ℹ️</span>
          <div>Key correction vs an either/or model: <b>Verification ≠ Approval</b>. Most inspections finish with no WMS change at all (Accepted). Only status changes reach the gate. Verification runs on a sample, asynchronously, and a mismatch <b>creates</b> a new change that still must pass the gate.</div>
        </div>

        <div className="flow-wrap" dangerouslySetInnerHTML={{ __html: FLOW_SVG }} />

        <div className="row mt16" style={{ alignItems: 'stretch' }}>
          <div className="card card-pad" style={{ flex: 1 }}>
            <h3 className="section-title">Why two lanes, not one gate</h3>
            <p className="note" style={{ lineHeight: 1.6 }}>The branch happens on <b>"is there a status change vs WMS?"</b> — not on "does SPV want to verify?". Accepted items (the majority) finish with no approval and no WMS write. Only proposed Available→Bad changes enter the gate, which protects the &lt;5-min write SLA. Verification is deliberately a sampled, after-the-fact audit so it never stalls inventory accuracy or piles onto the approval bottleneck.</p>
          </div>
          <div className="card card-pad" style={{ flex: 1 }}>
            <h3 className="section-title">Rules to define before build</h3>
            <p className="note" style={{ lineHeight: 1.6 }}>① <b>Sampling trigger</b> for the verification lane (e.g. always High-priority / &gt;20% items + random X% of the rest). ② <b>Authority:</b> on mismatch, SPV result supersedes the officer's. ③ <b>Config, not constants:</b> decision-matrix bands and the 20% verification sample are editable per category. ④ Mismatch-generated changes get a recommended 2nd-person check (AM / Ops Quality).</p>
          </div>
        </div>
      </div>
    </section>
  )
}

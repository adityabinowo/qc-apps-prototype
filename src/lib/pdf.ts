import jsPDF from 'jspdf'
import type { InspectionInterface } from './types'

type ReceiptData = InspectionInterface & {
  skuName?: string
  officerName?: string
  hubName?: string
}

export function buildQualityReceipt(data: ReceiptData): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' })
  const W = doc.internal.pageSize.getWidth()

  doc.setFillColor(41, 29, 128)
  doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14); doc.setFont('helvetica', 'bold')
  doc.text('QUALITY RECEIPT', W / 2, 12, { align: 'center' })
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text('Astro Quality Control', W / 2, 20, { align: 'center' })

  doc.setTextColor(40, 40, 40)
  let y = 38
  const row = (k: string, v: string) => {
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(k, 10, y)
    doc.setFont('helvetica', 'normal'); doc.text(v, W / 2, y); y += 7
  }
  const divider = () => { doc.setDrawColor(220, 220, 220); doc.line(10, y, W - 10, y); y += 5 }

  row('SKU', data.skuName ?? data.sku_id)
  row('Hub', data.hubName ?? data.hub_id)
  row('Officer', data.officerName ?? data.officer_id)
  row('Date', new Date(data.created_at).toLocaleString('id-ID'))
  divider()
  row('SOH', String(data.soh))
  row('Sampling qty', String(data.sampling_qty))
  row('Good', String(data.qty_good))
  row('Bad', String(data.qty_bad))
  row('% Non-Conf', `${data.nc_pct?.toFixed(1) ?? 0}%`)
  divider()
  row('Decision', data.decision ?? '')
  row('Lifecycle state', data.lifecycle_state ?? '')

  return doc.output('blob')
}

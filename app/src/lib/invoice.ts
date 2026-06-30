import type { Project } from '../types'

/**
 * 工事データから請求書(Excel)を生成してダウンロードする。
 * テンプレート(public/seikyu-template.xlsx)を読み込み、必要セルだけ流し込む。
 * 契約金額は税込として扱い、テンプレの数式(税抜→消費税→合計)に合わせて算出する。
 */
export async function generateInvoice(project: Project): Promise<void> {
  const mod: any = await import('exceljs')
  const ExcelJS = mod.default || mod

  const res = await fetch('/seikyu-template.xlsx')
  if (!res.ok) throw new Error('テンプレートの読み込みに失敗しました')
  const buf = await res.arrayBuffer()

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf)
  const ws = wb.worksheets[0]

  const total = (project.contract_amount || 0) + (project.change_amount || 0) // 税込
  const taxExcl = Math.round(total / 1.1)
  const round1 = (x: number) => Math.round(x * 10) / 10
  const tax = round1(taxExcl * 0.1)
  const gokei = taxExcl + tax

  // 入力セル
  ws.getCell('B6').value = project.client_name || ''
  ws.getCell('P4').value = project.billing_date ? new Date(project.billing_date) : new Date()
  ws.getCell('D21').value = project.name || ''
  ws.getCell('L21').value = 1
  ws.getCell('M21').value = '式'
  ws.getCell('N21').value = taxExcl
  ws.getCell('P21').value = 0.1
  if (project.location) ws.getCell('B43').value = `工事場所：${project.location}`

  // 数式セルは数式を残しつつ計算結果も埋める（再計算前でも正しく表示される）
  const setResult = (addr: string, result: number) => {
    const f = (ws.getCell(addr) as any).formula
    if (f) ws.getCell(addr).value = { formula: f, result } as any
  }
  setResult('Q21', taxExcl)
  setResult('D38', taxExcl)
  setResult('F38', tax)
  setResult('D39', 0)
  setResult('F39', 0)
  setResult('Q36', taxExcl)
  setResult('Q37', tax)
  setResult('Q38', gokei)
  setResult('B12', gokei)
  wb.calcProperties.fullCalcOnLoad = true

  const out = await wb.xlsx.writeBuffer()
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = (project.name || '請求書').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40)
  const dateStr = (project.billing_date || new Date().toISOString().slice(0, 10)).replace(/-/g, '')
  a.download = `請求書_${safeName}_${dateStr}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

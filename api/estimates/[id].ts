import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, toEstimate, cors } from '../_lib'
import { isFullPage } from '@notionhq/client'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const id = req.query.id as string

  if (req.method === 'GET') {
    const page = await notion.pages.retrieve({ page_id: id })
    if (!isFullPage(page)) return res.status(404).json({ error: 'not found' })
    return res.json(toEstimate(page))
  }

  if (req.method === 'PATCH') {
    const { title, customer_name, address, assignee, estimate_deadline, estimate_amount, cost_estimate, gross_profit, status, president_check, result, submission_date, decision_date, rejection_reason, request_content, notes } = req.body
    const props: any = {}
    if (title != null) props['案件名'] = { title: [{ text: { content: title } }] }
    if (customer_name != null) props['お客様名'] = { rich_text: [{ text: { content: customer_name } }] }
    if (address != null) props['現場住所'] = { rich_text: [{ text: { content: address } }] }
    if (assignee) props['担当者'] = { select: { name: assignee } }
    if (estimate_deadline !== undefined) props['見積期限'] = estimate_deadline ? { date: { start: estimate_deadline } } : { date: null }
    if (estimate_amount != null) props['見積金額'] = { number: estimate_amount }
    if (cost_estimate != null) props['原価予定'] = { number: cost_estimate }
    if (gross_profit != null) props['粗利予定'] = { number: gross_profit }
    if (status) props['ステータス'] = { status: { name: status } }
    if (president_check) props['社長チェック状況'] = { status: { name: president_check } }
    if (result) props['結果'] = { select: { name: result } }
    if (submission_date !== undefined) props['提出日'] = submission_date ? { date: { start: submission_date } } : { date: null }
    if (decision_date !== undefined) props['着工決定日'] = decision_date ? { date: { start: decision_date } } : { date: null }
    if (rejection_reason != null) props['ボツ理由'] = { rich_text: [{ text: { content: rejection_reason } }] }
    if (request_content != null) props['依頼内容'] = { rich_text: [{ text: { content: request_content } }] }
    if (notes != null) props['メモ'] = { rich_text: [{ text: { content: notes } }] }
    const page = await notion.pages.update({ page_id: id, properties: props })
    return res.json(toEstimate(page))
  }

  if (req.method === 'DELETE') {
    await notion.pages.update({ page_id: id, archived: true })
    return res.json({ ok: true })
  }

  res.status(405).end()
}

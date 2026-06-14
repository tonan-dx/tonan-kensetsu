import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, ESTIMATES_DB, toEstimate, cors } from './_lib'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    const showAll = req.query.show_all === 'true'
    const filter: any = showAll ? {} : {
      filter: {
        property: 'ステータス',
        status: { does_not_equal: 'ボツ／失注' },
      },
    }
    const response = await notion.databases.query({
      database_id: ESTIMATES_DB,
      sorts: [{ property: '見積期限', direction: 'ascending' }],
      ...filter,
    })
    return res.json(response.results.map(toEstimate).filter(Boolean))
  }

  if (req.method === 'POST') {
    const { title, customer_name, address, assignee, estimate_deadline, estimate_amount, cost_estimate, gross_profit, status, request_content, notes } = req.body
    const props: any = {
      '案件名': { title: [{ text: { content: title ?? '' } }] },
    }
    if (customer_name) props['お客様名'] = { rich_text: [{ text: { content: customer_name } }] }
    if (address) props['現場住所'] = { rich_text: [{ text: { content: address } }] }
    if (assignee) props['担当者'] = { select: { name: assignee } }
    if (estimate_deadline) props['見積期限'] = { date: { start: estimate_deadline } }
    if (estimate_amount != null) props['見積金額'] = { number: estimate_amount }
    if (cost_estimate != null) props['原価予定'] = { number: cost_estimate }
    if (gross_profit != null) props['粗利予定'] = { number: gross_profit }
    if (status) props['ステータス'] = { status: { name: status } }
    if (request_content) props['依頼内容'] = { rich_text: [{ text: { content: request_content } }] }
    if (notes) props['メモ'] = { rich_text: [{ text: { content: notes } }] }
    const page = await notion.pages.create({ parent: { database_id: ESTIMATES_DB }, properties: props })
    return res.json(toEstimate(page))
  }

  res.status(405).end()
}

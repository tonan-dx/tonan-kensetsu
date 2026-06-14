import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, PROJECTS_DB, toProject, cors } from './_lib'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    const response = await notion.databases.query({
      database_id: PROJECTS_DB,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    })
    return res.json(response.results.map(toProject).filter(Boolean))
  }

  if (req.method === 'POST') {
    const { name, client_name, location, status, start_date, end_date, contract_amount, type, assignee } = req.body
    const props: any = {
      '工事名': { title: [{ text: { content: name ?? '' } }] },
    }
    if (client_name) props['お客様名'] = { rich_text: [{ text: { content: client_name } }] }
    if (location) props['現場住所'] = { rich_text: [{ text: { content: location } }] }
    if (status) props['工事ステータス'] = { status: { name: status } }
    if (start_date) props['工期'] = { date: { start: start_date, end: end_date ?? null } }
    if (contract_amount != null) props['契約金額'] = { number: contract_amount }
    if (type) props['工事種別'] = { select: { name: type } }
    if (assignee) props['担当者'] = { select: { name: assignee } }
    const page = await notion.pages.create({ parent: { database_id: PROJECTS_DB }, properties: props })
    return res.json(toProject(page))
  }

  res.status(405).end()
}

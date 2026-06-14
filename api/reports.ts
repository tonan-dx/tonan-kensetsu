import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, REPORTS_DB, toReport, buildProjectMap, cors } from './_lib'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    const filter: any = {}
    if (req.query.project_id) {
      filter.filter = { property: '関連工事', relation: { contains: req.query.project_id as string } }
    }
    const response = await notion.databases.query({
      database_id: REPORTS_DB,
      sorts: [{ property: '日付', direction: 'descending' }],
      ...filter,
    })
    const projectIds = [...new Set(
      response.results.map((r: any) => r.properties?.['関連工事']?.relation?.[0]?.id).filter(Boolean)
    )] as string[]
    const projectMap = await buildProjectMap(projectIds)
    return res.json(response.results.map(r => toReport(r, projectMap)).filter(Boolean))
  }

  if (req.method === 'POST') {
    const { title, project_id, report_date, weather, workers_count, work_content, tomorrow, notes, trouble, assignee } = req.body
    const props: any = {
      '日報タイトル': { title: [{ text: { content: title ?? '' } }] },
    }
    if (report_date) props['日付'] = { date: { start: report_date } }
    if (weather) props['天気'] = { select: { name: weather } }
    if (workers_count != null) props['作業人数'] = { number: workers_count }
    if (work_content) props['今日やった作業'] = { rich_text: [{ text: { content: work_content } }] }
    if (tomorrow) props['明日やること'] = { rich_text: [{ text: { content: tomorrow } }] }
    if (notes) props['社長・担当者への確認事項'] = { rich_text: [{ text: { content: notes } }] }
    if (trouble != null) props['トラブル'] = { checkbox: trouble }
    if (assignee) props['担当者'] = { select: { name: assignee } }
    if (project_id) props['関連工事'] = { relation: [{ id: project_id }] }
    const page = await notion.pages.create({ parent: { database_id: REPORTS_DB }, properties: props })
    return res.json(toReport(page))
  }

  res.status(405).end()
}

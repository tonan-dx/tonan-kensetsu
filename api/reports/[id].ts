import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, toReport, buildProjectMap, cors } from '../_lib'
import { isFullPage } from '@notionhq/client'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const id = req.query.id as string

  if (req.method === 'GET') {
    const page = await notion.pages.retrieve({ page_id: id })
    if (!isFullPage(page)) return res.status(404).json({ error: 'not found' })
    const projectId = (page.properties as any)['関連工事']?.relation?.[0]?.id ?? null
    const projectMap = await buildProjectMap(projectId ? [projectId] : [])
    return res.json(toReport(page, projectMap))
  }

  if (req.method === 'PATCH') {
    const { title, project_id, report_date, weather, workers_count, work_content, tomorrow, notes, trouble, assignee } = req.body
    const props: any = {}
    if (title != null) props['日報タイトル'] = { title: [{ text: { content: title } }] }
    if (report_date !== undefined) props['日付'] = { date: { start: report_date } }
    if (weather) props['天気'] = { select: { name: weather } }
    if (workers_count != null) props['作業人数'] = { number: workers_count }
    if (work_content != null) props['今日やった作業'] = { rich_text: [{ text: { content: work_content } }] }
    if (tomorrow != null) props['明日やること'] = { rich_text: [{ text: { content: tomorrow } }] }
    if (notes != null) props['社長・担当者への確認事項'] = { rich_text: [{ text: { content: notes } }] }
    if (trouble != null) props['トラブル'] = { checkbox: trouble }
    if (assignee) props['担当者'] = { select: { name: assignee } }
    if (project_id !== undefined) props['関連工事'] = project_id ? { relation: [{ id: project_id }] } : { relation: [] }
    const page = await notion.pages.update({ page_id: id, properties: props })
    return res.json(toReport(page))
  }

  if (req.method === 'DELETE') {
    await notion.pages.update({ page_id: id, archived: true })
    return res.json({ ok: true })
  }

  res.status(405).end()
}

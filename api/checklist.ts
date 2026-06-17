import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, toTask, TASKS_DB, cors } from './_lib'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const id = req.query.id as string | undefined

  try {
    if (!id) {
      // /api/checklist — list & create
      if (req.method === 'GET') {
        const { ref_id, ref_type } = req.query
        const filters: any[] = []
        if (ref_id) filters.push({ property: '関連先ID', rich_text: { equals: String(ref_id) } })
        if (ref_type) filters.push({ property: '関連先タイプ', select: { equals: String(ref_type) } })
        const response = await notion.databases.query({
          database_id: TASKS_DB,
          filter: filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : { and: filters },
          sorts: [{ property: '完了', direction: 'ascending' }, { timestamp: 'created_time', direction: 'ascending' }],
        })
        return res.json(response.results.map(p => toTask(p)).filter(Boolean))
      }
      if (req.method === 'POST') {
        const { name, assignee, due_date, notes, ref_id, ref_type } = req.body
        const props: any = { 'タスク名': { title: [{ text: { content: name || '' } }] } }
        if (assignee) props['担当者'] = { select: { name: assignee } }
        if (due_date) props['期限'] = { date: { start: due_date } }
        if (notes) props['備考'] = { rich_text: [{ text: { content: notes } }] }
        if (ref_id) props['関連先ID'] = { rich_text: [{ text: { content: ref_id } }] }
        if (ref_type) props['関連先タイプ'] = { select: { name: ref_type } }
        const page = await notion.pages.create({ parent: { database_id: TASKS_DB }, properties: props })
        return res.status(201).json(toTask(page))
      }
      return res.status(405).end()
    }

    // /api/checklist/:id — detail
    if (req.method === 'PATCH') {
      const { name, assignee, done, due_date, notes } = req.body
      const props: any = {}
      if (name != null) props['タスク名'] = { title: [{ text: { content: name } }] }
      if (assignee !== undefined) props['担当者'] = assignee ? { select: { name: assignee } } : { select: null }
      if (done != null) props['完了'] = { checkbox: done }
      if (due_date !== undefined) props['期限'] = due_date ? { date: { start: due_date } } : { date: null }
      if (notes != null) props['備考'] = { rich_text: [{ text: { content: notes } }] }
      const page = await notion.pages.update({ page_id: id, properties: props })
      return res.json(toTask(page))
    }
    if (req.method === 'DELETE') {
      await notion.pages.update({ page_id: id, archived: true })
      return res.json({ ok: true })
    }
    res.status(405).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: String(e) })
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, toTask, cors } from '../_lib'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const id = req.query.id as string

  try {
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

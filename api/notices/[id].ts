import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, toNotice, cors } from '../_lib'
import { isFullPage } from '@notionhq/client'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const id = req.query.id as string

  if (req.method === 'GET') {
    const page = await notion.pages.retrieve({ page_id: id })
    if (!isFullPage(page)) return res.status(404).json({ error: 'not found' })
    return res.json(toNotice(page))
  }

  if (req.method === 'PATCH') {
    const { title, content, date, poster } = req.body
    const props: any = {}
    if (title != null) props['タイトル'] = { title: [{ text: { content: title } }] }
    if (content != null) props['内容'] = { rich_text: [{ text: { content } }] }
    if (date !== undefined) props['日付'] = date ? { date: { start: date } } : { date: null }
    if (poster) props['投稿者'] = { select: { name: poster } }
    const page = await notion.pages.update({ page_id: id, properties: props })
    return res.json(toNotice(page))
  }

  if (req.method === 'DELETE') {
    await notion.pages.update({ page_id: id, archived: true })
    return res.json({ ok: true })
  }

  res.status(405).end()
}

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, toNotice, NOTICES_DB, cors } from './_lib'
import { isFullPage } from '@notionhq/client'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const id = req.query.id as string | undefined

  try {
    if (!id) {
      // /api/notices — list & create
      if (req.method === 'GET') {
        const response = await notion.databases.query({
          database_id: NOTICES_DB,
          sorts: [{ property: '日付', direction: 'descending' }],
        })
        return res.json(response.results.map(toNotice).filter(Boolean))
      }
      if (req.method === 'POST') {
        const { title, content, date, poster } = req.body
        const props: any = { 'タイトル': { title: [{ text: { content: title ?? '' } }] } }
        if (content) props['内容'] = { rich_text: [{ text: { content } }] }
        if (date) props['日付'] = { date: { start: date } }
        if (poster) props['投稿者'] = { select: { name: poster } }
        const page = await notion.pages.create({ parent: { database_id: NOTICES_DB }, properties: props })
        return res.json(toNotice(page))
      }
      return res.status(405).end()
    }

    // /api/notices/:id — detail
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
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: String(e) })
  }
}

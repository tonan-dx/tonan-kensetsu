import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, toNotice, NOTICES_DB, cors } from './_lib'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    const response = await notion.databases.query({
      database_id: NOTICES_DB,
      sorts: [{ property: '日付', direction: 'descending' }],
    })
    const notices = response.results.map(toNotice).filter(Boolean)
    return res.json(notices)
  }

  if (req.method === 'POST') {
    const { title, content, date, poster } = req.body
    const props: any = {
      'タイトル': { title: [{ text: { content: title ?? '' } }] },
    }
    if (content) props['内容'] = { rich_text: [{ text: { content } }] }
    if (date) props['日付'] = { date: { start: date } }
    if (poster) props['投稿者'] = { select: { name: poster } }
    const page = await notion.pages.create({ parent: { database_id: NOTICES_DB }, properties: props })
    return res.json(toNotice(page))
  }

  res.status(405).end()
}

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, toNotice, NOTICES_DB, cors } from './_lib'
import { isFullPage } from '@notionhq/client'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const id = req.query.id as string | undefined
  // kind=minutes のときは議事録（お知らせDBに 種別=議事録 で相乗り）を扱う
  const isMinutes = req.query.kind === 'minutes'
  const KIND = isMinutes ? '議事録' : 'お知らせ'

  try {
    if (!id) {
      // /api/notices — list & create
      if (req.method === 'GET') {
        // 議事録一覧は 種別=議事録 のみ。お知らせ一覧は 連絡・議事録 を除外。
        const filter = isMinutes
          ? { property: '種別', select: { equals: '議事録' } }
          : { and: [
              { property: '種別', select: { does_not_equal: '連絡' } },
              { property: '種別', select: { does_not_equal: '議事録' } },
            ] }
        const response = await notion.databases.query({
          database_id: NOTICES_DB,
          filter,
          sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        })
        return res.json(response.results.map(toNotice).filter(Boolean))
      }
      if (req.method === 'POST') {
        const { title, content, date, poster, office } = req.body
        const props: any = {
          'タイトル': { title: [{ text: { content: title ?? '' } }] },
          '種別': { select: { name: KIND } },
        }
        if (content) props['内容'] = { rich_text: [{ text: { content } }] }
        if (date) props['日付'] = { date: { start: date } }
        if (poster) props['投稿者'] = { select: { name: poster } }
        if (office) props['拠点'] = { select: { name: office } }
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
      const { title, content, date, poster, confirmed_by, office } = req.body
      const props: any = {}
      if (title != null) props['タイトル'] = { title: [{ text: { content: title } }] }
      if (content != null) props['内容'] = { rich_text: [{ text: { content } }] }
      if (date !== undefined) props['日付'] = date ? { date: { start: date } } : { date: null }
      if (poster) props['投稿者'] = { select: { name: poster } }
      if (confirmed_by != null) props['確認者リスト'] = { multi_select: confirmed_by.map((name: string) => ({ name })) }
      if (office !== undefined) props['拠点'] = office ? { select: { name: office } } : { select: null }
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

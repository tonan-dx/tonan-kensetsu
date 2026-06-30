import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, toContact, CONTACTS_DB, cors } from './_lib'
import { isFullPage } from '@notionhq/client'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const id = req.query.id as string | undefined

  try {
    if (!id) {
      // /api/contacts — list & create
      if (req.method === 'GET') {
        const response = await notion.databases.query({
          database_id: CONTACTS_DB,
          sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        })
        return res.json(response.results.map(toContact).filter(Boolean))
      }
      if (req.method === 'POST') {
        const { subject, recipients, content, poster, date, office } = req.body
        const props: any = { '件名': { title: [{ text: { content: subject ?? '' } }] } }
        if (Array.isArray(recipients) && recipients.length > 0) props['宛先'] = { multi_select: recipients.map((name: string) => ({ name })) }
        if (content) props['内容'] = { rich_text: [{ text: { content } }] }
        if (poster) props['投稿者'] = { select: { name: poster } }
        if (date) props['日付'] = { date: { start: date } }
        if (office) props['拠点'] = { select: { name: office } }
        const page = await notion.pages.create({ parent: { database_id: CONTACTS_DB }, properties: props })
        return res.status(201).json(toContact(page))
      }
      return res.status(405).end()
    }

    // /api/contacts/:id — detail
    if (req.method === 'GET') {
      const page = await notion.pages.retrieve({ page_id: id })
      if (!isFullPage(page)) return res.status(404).json({ error: 'not found' })
      return res.json(toContact(page))
    }
    if (req.method === 'PATCH') {
      const { subject, recipients, content, poster, date, office, confirmed, confirmed_by } = req.body
      const props: any = {}
      if (subject != null) props['件名'] = { title: [{ text: { content: subject } }] }
      if (recipients !== undefined) props['宛先'] = { multi_select: (recipients ?? []).map((name: string) => ({ name })) }
      if (content != null) props['内容'] = { rich_text: [{ text: { content } }] }
      if (poster) props['投稿者'] = { select: { name: poster } }
      if (date !== undefined) props['日付'] = date ? { date: { start: date } } : { date: null }
      if (office !== undefined) props['拠点'] = office ? { select: { name: office } } : { select: null }
      if (confirmed != null) props['確認済み'] = { checkbox: confirmed }
      if (confirmed_by != null) props['確認者リスト'] = { multi_select: confirmed_by.map((name: string) => ({ name })) }
      const page = await notion.pages.update({ page_id: id, properties: props })
      return res.json(toContact(page))
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

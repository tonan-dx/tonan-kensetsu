import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, toContact, NOTICES_DB, cors, getText, parseReplies, CONTACT_REPLY_PROP } from './_lib'
import { isFullPage } from '@notionhq/client'

// 連絡（報連相）は お知らせDB(NOTICES_DB) に 種別=連絡 として格納する
const KIND = '連絡'

// 返信スレッド（会話）は各連絡ページの rich_text プロパティに JSON で保存する。
// Notionの rich_text は1オブジェクト2000字上限のため、分割して書き込む。
function chunkText(s: string, size = 1900): { text: { content: string } }[] {
  if (!s) return [{ text: { content: '' } }]
  const out: { text: { content: string } }[] = []
  for (let i = 0; i < s.length; i += size) out.push({ text: { content: s.slice(i, i + size) } })
  return out.slice(0, 100)
}

async function readReplies(id: string): Promise<any[]> {
  const page: any = await notion.pages.retrieve({ page_id: id })
  return parseReplies(getText(page.properties?.[CONTACT_REPLY_PROP]))
}

async function writeReplies(id: string, replies: any[]): Promise<void> {
  // プロパティが未作成でも書けるよう、先にスキーマへ追加を試みる（既存なら実質no-op）
  await notion.databases.update({
    database_id: NOTICES_DB,
    properties: { [CONTACT_REPLY_PROP]: { rich_text: {} } },
  }).catch(() => { /* 既に存在 */ })
  await notion.pages.update({
    page_id: id,
    properties: { [CONTACT_REPLY_PROP]: { rich_text: chunkText(JSON.stringify(replies)) } },
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const id = req.query.id as string | undefined

  try {
    if (!id) {
      // /api/contacts — list & create
      if (req.method === 'GET') {
        const response = await notion.databases.query({
          database_id: NOTICES_DB,
          filter: { property: '種別', select: { equals: KIND } },
          sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        })
        return res.json(response.results.map(toContact).filter(Boolean))
      }
      if (req.method === 'POST') {
        const { subject, recipients, content, poster, date, office } = req.body
        const props: any = {
          'タイトル': { title: [{ text: { content: subject ?? '' } }] },
          '種別': { select: { name: KIND } },
        }
        if (Array.isArray(recipients) && recipients.length > 0) props['宛先'] = { multi_select: recipients.map((name: string) => ({ name })) }
        if (content) props['内容'] = { rich_text: [{ text: { content } }] }
        if (poster) props['投稿者'] = { select: { name: poster } }
        if (date) props['日付'] = { date: { start: date } }
        if (office) props['拠点'] = { select: { name: office } }
        const page = await notion.pages.create({ parent: { database_id: NOTICES_DB }, properties: props })
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
    // 返信を追加（会話スレッドへ1件append）
    if (req.method === 'POST') {
      const { author, content, attachments } = req.body ?? {}
      if (!content && (!Array.isArray(attachments) || attachments.length === 0)) {
        return res.status(400).json({ error: '本文か添付が必要です' })
      }
      const replies = await readReplies(id)
      const reply = {
        id: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
        author: author || '',
        content: content || '',
        at: new Date().toISOString(),
        attachments: Array.isArray(attachments) ? attachments : [],
      }
      replies.push(reply)
      await writeReplies(id, replies)
      return res.status(201).json(reply)
    }
    if (req.method === 'PATCH') {
      // reply_id が指定されていれば、その返信1件だけ本文/添付を編集する
      const replyId = req.body?.reply_id as string | undefined
      if (replyId) {
        const replies = await readReplies(id)
        const idx = replies.findIndex(r => r.id === replyId)
        if (idx < 0) return res.status(404).json({ error: 'reply not found' })
        if (typeof req.body.content === 'string') replies[idx].content = req.body.content
        if (Array.isArray(req.body.attachments)) replies[idx].attachments = req.body.attachments
        replies[idx].edited_at = new Date().toISOString()
        await writeReplies(id, replies)
        return res.json(replies[idx])
      }
      const { subject, recipients, content, poster, date, office, confirmed, confirmed_by } = req.body
      const props: any = {}
      if (subject != null) props['タイトル'] = { title: [{ text: { content: subject } }] }
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
      // ?reply=xxx が付いていれば返信1件だけ削除、なければ連絡自体を削除
      const replyId = req.query.reply as string | undefined
      if (replyId) {
        const replies = await readReplies(id)
        await writeReplies(id, replies.filter(r => r.id !== replyId))
        return res.json({ ok: true })
      }
      await notion.pages.update({ page_id: id, archived: true })
      return res.json({ ok: true })
    }
    res.status(405).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: String(e) })
  }
}

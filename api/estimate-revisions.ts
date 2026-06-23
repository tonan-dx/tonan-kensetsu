import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, ESTIMATE_REVISIONS_DB, toEstimateRevision, cors } from './_lib'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const id = req.query.id as string | undefined

  // DELETE /api/estimate-revisions/:id
  if (req.method === 'DELETE' && id) {
    await notion.pages.update({ page_id: id, archived: true })
    return res.json({ ok: true })
  }

  // GET /api/estimate-revisions?estimate_id=xxx
  if (req.method === 'GET') {
    const estimate_id = req.query.estimate_id as string
    if (!estimate_id) return res.status(400).json({ error: 'estimate_id required' })
    const response = await notion.databases.query({
      database_id: ESTIMATE_REVISIONS_DB,
      filter: {
        property: '見積ID',
        rich_text: { equals: estimate_id },
      },
      sorts: [{ property: '登録日', direction: 'descending' }],
    })
    return res.json(response.results.map(toEstimateRevision).filter(Boolean))
  }

  // POST /api/estimate-revisions
  if (req.method === 'POST') {
    const { estimate_id, version_name, drive_url, registered_date, memo } = req.body
    if (!estimate_id || !version_name || !drive_url) {
      return res.status(400).json({ error: 'estimate_id, version_name, drive_url required' })
    }
    const props: any = {
      '版名': { title: [{ text: { content: version_name } }] },
      '見積ID': { rich_text: [{ text: { content: estimate_id } }] },
      'Google Drive URL': { url: drive_url },
    }
    if (registered_date) props['登録日'] = { date: { start: registered_date } }
    if (memo) props['メモ'] = { rich_text: [{ text: { content: memo } }] }
    const page = await notion.pages.create({
      parent: { database_id: ESTIMATE_REVISIONS_DB },
      properties: props,
    })
    return res.json(toEstimateRevision(page))
  }

  res.status(405).end()
}

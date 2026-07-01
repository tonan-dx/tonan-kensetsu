import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, getText, cors } from './_lib'

// 見積リビジョンは、連携済みの見積DBの各見積ページ内に JSON で保存する
// （専用DBが連携未共有で読めないため）
interface Rev {
  id: string
  version_name: string
  drive_url: string
  registered_date: string | null
  memo: string | null
}

async function readRevs(estimateId: string): Promise<Rev[]> {
  const page: any = await notion.pages.retrieve({ page_id: estimateId })
  const text = getText(page.properties?.['見積リビジョン'])
  if (!text) return []
  try {
    const arr = JSON.parse(text)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function writeRevs(estimateId: string, revs: Rev[]): Promise<void> {
  await notion.pages.update({
    page_id: estimateId,
    properties: { '見積リビジョン': { rich_text: [{ text: { content: JSON.stringify(revs) } }] } },
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const id = req.query.id as string | undefined

  try {
    // DELETE /api/estimate-revisions/:id  （id は "見積ID__ローカルID"）
    if (req.method === 'DELETE' && id) {
      const estimateId = id.split('__')[0]
      const revs = await readRevs(estimateId)
      await writeRevs(estimateId, revs.filter(r => r.id !== id))
      return res.json({ ok: true })
    }

    // GET /api/estimate-revisions?estimate_id=xxx
    if (req.method === 'GET') {
      const estimate_id = req.query.estimate_id as string
      if (!estimate_id) return res.status(400).json({ error: 'estimate_id required' })
      const revs = await readRevs(estimate_id)
      revs.sort((a, b) => (b.registered_date || '').localeCompare(a.registered_date || ''))
      return res.json(revs)
    }

    // POST /api/estimate-revisions
    if (req.method === 'POST') {
      const { estimate_id, version_name, drive_url, registered_date, memo } = req.body
      if (!estimate_id || !version_name || !drive_url) {
        return res.status(400).json({ error: 'estimate_id, version_name, drive_url required' })
      }
      const revs = await readRevs(estimate_id)
      const rev: Rev = {
        id: `${estimate_id}__${Date.now()}${Math.floor(Math.random() * 1000)}`,
        version_name,
        drive_url,
        registered_date: registered_date || null,
        memo: memo || null,
      }
      revs.push(rev)
      await writeRevs(estimate_id, revs)
      return res.status(201).json(rev)
    }

    res.status(405).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: String(e) })
  }
}

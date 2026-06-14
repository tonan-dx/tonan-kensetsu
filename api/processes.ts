import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, PROCESSES_DB, toProcess, cors } from './_lib'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const response = await notion.databases.query({
      database_id: PROCESSES_DB,
      sorts: [{ property: '予定開始日', direction: 'ascending' }],
      page_size: 100,
    })
    const processes = response.results.map(toProcess).filter(Boolean)
    return res.json(processes)
  } catch (e) {
    // 工程管理DBがインテグレーションに未接続の場合は空配列を返す
    return res.json([])
  }
}

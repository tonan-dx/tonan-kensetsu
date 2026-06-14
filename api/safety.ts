import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, SAFETY_DB, toSafety, buildProjectMap, cors } from './_lib'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    if (req.method === 'GET') {
      const filter: any = {}
      if (req.query.project_id) {
        filter.filter = { property: '関連工事', relation: { contains: req.query.project_id as string } }
      }
      const response = await notion.databases.query({
        database_id: SAFETY_DB,
        sorts: [{ property: '日付', direction: 'descending' }],
        page_size: 100,
        ...filter,
      })
      const projectIds = [...new Set(
        response.results.map((r: any) => r.properties?.['関連工事']?.relation?.[0]?.id).filter(Boolean)
      )] as string[]
      const projectMap = await buildProjectMap(projectIds)
      return res.json(response.results.map(r => toSafety(r, projectMap)).filter(Boolean))
    }

    if (req.method === 'POST') {
      const { title, date, project_id, ky_activity, near_miss, safety_log, hazard, corrective_action, confirmed } = req.body
      const props: any = {
        '安全記録タイトル': { title: [{ text: { content: title ?? '' } }] },
      }
      if (date) props['日付'] = { date: { start: date } }
      if (project_id) props['関連工事'] = { relation: [{ id: project_id }] }
      if (ky_activity) props['KY活動記録'] = { rich_text: [{ text: { content: ky_activity } }] }
      if (near_miss) props['ヒヤリハット'] = { rich_text: [{ text: { content: near_miss } }] }
      if (safety_log) props['安全日誌'] = { rich_text: [{ text: { content: safety_log } }] }
      if (hazard) props['危険箇所'] = { rich_text: [{ text: { content: hazard } }] }
      if (corrective_action) props['是正対応'] = { rich_text: [{ text: { content: corrective_action } }] }
      if (confirmed != null) props['確認済みチェック'] = { checkbox: confirmed }
      const page = await notion.pages.create({ parent: { database_id: SAFETY_DB }, properties: props })
      return res.json(toSafety(page))
    }

    res.status(405).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: String(e) })
  }
}

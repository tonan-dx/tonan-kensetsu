import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, toSafety, buildProjectMap, cors } from '../_lib'
import { isFullPage } from '@notionhq/client'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const id = req.query.id as string

  try {
    if (req.method === 'GET') {
      const page = await notion.pages.retrieve({ page_id: id })
      if (!isFullPage(page)) return res.status(404).json({ error: 'not found' })
      const projectId = (page.properties as any)['関連工事']?.relation?.[0]?.id ?? null
      const projectMap = await buildProjectMap(projectId ? [projectId] : [])
      return res.json(toSafety(page, projectMap))
    }

    if (req.method === 'PATCH') {
      const { title, date, project_id, ky_activity, near_miss, safety_log, hazard, corrective_action, confirmed, confirmed_by, office } = req.body
      const props: any = {}
      if (title != null) props['安全記録タイトル'] = { title: [{ text: { content: title } }] }
      if (date !== undefined) props['日付'] = { date: { start: date } }
      if (project_id !== undefined) props['関連工事'] = project_id ? { relation: [{ id: project_id }] } : { relation: [] }
      if (ky_activity != null) props['KY活動記録'] = { rich_text: [{ text: { content: ky_activity } }] }
      if (near_miss != null) props['ヒヤリハット'] = { rich_text: [{ text: { content: near_miss } }] }
      if (safety_log != null) props['安全日誌'] = { rich_text: [{ text: { content: safety_log } }] }
      if (hazard != null) props['危険箇所'] = { rich_text: [{ text: { content: hazard } }] }
      if (corrective_action != null) props['是正対応'] = { rich_text: [{ text: { content: corrective_action } }] }
      if (confirmed != null) props['確認済みチェック'] = { checkbox: confirmed }
      if (confirmed_by != null) props['確認者リスト'] = { multi_select: confirmed_by.map((name: string) => ({ name })) }
      if (office !== undefined) props['拠点'] = office ? { select: { name: office } } : { select: null }
      const page = await notion.pages.update({ page_id: id, properties: props })
      return res.json(toSafety(page))
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

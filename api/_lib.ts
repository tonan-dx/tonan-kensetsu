import { Client, isFullPage } from '@notionhq/client'

export const notion = new Client({ auth: process.env.NOTION_TOKEN })

export const PROJECTS_DB = '4e8426e7a4d1480f8efa956b3643cdb2'
export const REPORTS_DB  = 'a5f67b8bb359497c989cf397d8eb345a'

export function getTitle(prop: any): string {
  return prop?.title?.map((t: any) => t.plain_text).join('') ?? ''
}
export function getText(prop: any): string {
  return prop?.rich_text?.map((t: any) => t.plain_text).join('') ?? ''
}
export function getSelect(prop: any): string {
  return prop?.select?.name ?? ''
}
export function getStatus(prop: any): string {
  return prop?.status?.name ?? ''
}

export function toProject(page: any) {
  if (!isFullPage(page)) return null
  const p = page.properties as any
  return {
    id: page.id,
    name: getTitle(p['工事名']),
    client_name: getText(p['お客様名']),
    location: getText(p['現場住所']),
    status: getStatus(p['工事ステータス']),
    start_date: p['工期']?.date?.start ?? null,
    end_date: p['工期']?.date?.end ?? null,
    contract_amount: p['契約金額']?.number ?? null,
    assignee: getSelect(p['担当者']),
    type: getSelect(p['工事種別']),
    created_at: page.created_time,
    notion_url: page.url,
  }
}

export async function buildProjectMap(ids: string[]): Promise<Record<string, any>> {
  if (ids.length === 0) return {}
  const pages = await Promise.all(
    ids.map(id => notion.pages.retrieve({ page_id: id }).catch(() => null))
  )
  const map: Record<string, any> = {}
  for (const page of pages) {
    const proj = page ? toProject(page) : null
    if (proj) map[proj.id] = { id: proj.id, name: proj.name }
  }
  return map
}

export function toReport(page: any, projectMap: Record<string, any> = {}) {
  if (!isFullPage(page)) return null
  const p = page.properties as any
  const projectId = p['関連工事']?.relation?.[0]?.id ?? null
  return {
    id: page.id,
    title: getTitle(p['日報タイトル']),
    project_id: projectId,
    project: projectId ? (projectMap[projectId] ?? null) : null,
    report_date: p['日付']?.date?.start ?? null,
    weather: getSelect(p['天気']),
    workers_count: p['作業人数']?.number ?? null,
    work_content: getText(p['今日やった作業']),
    tomorrow: getText(p['明日やること']),
    notes: getText(p['社長・担当者への確認事項']),
    trouble: p['トラブル']?.checkbox ?? false,
    check_status: getStatus(p['確認ステータス']),
    assignee: getSelect(p['担当者']),
    created_at: page.created_time,
    notion_url: page.url,
  }
}

export function cors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

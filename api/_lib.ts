import { Client, isFullPage } from '@notionhq/client'

export const notion = new Client({ auth: process.env.NOTION_TOKEN })

export const PROJECTS_DB          = '4e8426e7a4d1480f8efa956b3643cdb2'
export const REPORTS_DB           = 'a5f67b8bb359497c989cf397d8eb345a'
export const ESTIMATES_DB         = '9d7c1e35-7039-4452-acb0-c83a5d2fd799'
export const PROCESSES_DB         = '79dcabf6-0b5a-495e-8e4a-7a2e859f4245'
export const SAFETY_DB            = '8c6634ec-9ec7-41a5-a796-c5b13c6ceac4'
export const TASKS_DB             = '9b42effe-3601-46e1-978c-9ebb8fc6fc0d'
export const NOTICES_DB           = '5e990df0-0082-4d72-9b02-e75615bf76e9'
export const CONTACTS_DB          = '71bfc63c-924f-4890-9086-c96739015b74'
export const ESTIMATE_REVISIONS_DB = 'b024cd6dd0354eb98eb6dac2ca2ae80e'

export function getTitle(prop: any): string {
  return prop?.title?.map((t: any) => t.plain_text).join('') ?? ''
}
export function getText(prop: any): string {
  return prop?.rich_text?.map((t: any) => t.plain_text).join('') ?? ''
}
export function getSelect(prop: any): string {
  return prop?.select?.name ?? ''
}
export function getMultiSelect(prop: any): string[] {
  return prop?.multi_select?.map((s: any) => s.name) ?? []
}
export function getPerson(prop: any): string {
  return prop?.people?.[0]?.name ?? ''
}
export function getStatus(prop: any): string {
  return prop?.status?.name ?? ''
}
export function getPhone(prop: any): string | null {
  return prop?.phone_number ?? null
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
    category: getSelect(p['工事分類']) || null,
    contract_date: p['契約日']?.date?.start ?? null,
    contact: getPhone(p['連絡先']),
    change_amount: p['増減金額']?.number ?? null,
    billing_date: p['請求日']?.date?.start ?? null,
    payment_date: p['入金日']?.date?.start ?? null,
    notes: getText(p['備考']) || null,
    office: getSelect(p['拠点']) || null,
    created_at: page.created_time,
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
    office: getSelect(p['拠点']) || null,
    created_at: page.created_time,
  }
}

export function toEstimate(page: any) {
  if (!isFullPage(page)) return null
  const p = page.properties as any
  return {
    id: page.id,
    title: getTitle(p['案件名']),
    customer_name: getText(p['お客様名']) || null,
    address: getText(p['現場住所']) || null,
    assignee: getSelect(p['担当者']) || null,
    estimate_deadline: p['見積期限']?.date?.start ?? null,
    estimate_amount: p['見積金額']?.number ?? null,
    cost_estimate: p['原価予定']?.number ?? null,
    gross_profit: p['粗利予定']?.number ?? null,
    status: getStatus(p['ステータス']) || null,
    president_check: getStatus(p['社長チェック状況']) || null,
    result: getSelect(p['結果']) || null,
    submission_date: p['提出日']?.date?.start ?? null,
    decision_date: p['着工決定日']?.date?.start ?? null,
    rejection_reason: getText(p['ボツ理由']) || null,
    request_content: getText(p['依頼内容']) || null,
    contact: getPhone(p['連絡先']),
    category: getSelect(p['工事分類']) || null,
    notes: getText(p['メモ']) || null,
    related_project_id: p['関連工事']?.relation?.[0]?.id ?? null,
    office: getSelect(p['拠点']) || null,
    created_at: page.created_time,
  }
}

export function toSafety(page: any, projectMap: Record<string, any> = {}) {
  if (!isFullPage(page)) return null
  const p = page.properties as any
  const projectId = p['関連工事']?.relation?.[0]?.id ?? null
  return {
    id: page.id,
    title: getTitle(p['安全記録タイトル']),
    date: p['日付']?.date?.start ?? null,
    project_id: projectId,
    project: projectId ? (projectMap[projectId] ?? null) : null,
    ky_activity: getText(p['KY活動記録']) || null,
    near_miss: getText(p['ヒヤリハット']) || null,
    safety_log: getText(p['安全日誌']) || null,
    hazard: getText(p['危険箇所']) || null,
    corrective_action: getText(p['是正対応']) || null,
    recorder: getPerson(p['記入者']) || null,
    reviewer: getPerson(p['確認者']) || null,
    confirmed: p['確認済みチェック']?.checkbox ?? false,
    confirmed_by: getMultiSelect(p['確認者リスト']),
    office: getSelect(p['拠点']) || null,
    created_at: page.created_time,
  }
}

export function toTask(page: any) {
  if (!isFullPage(page)) return null
  const p = page.properties as any
  return {
    id: page.id,
    name: getTitle(p['タスク名']),
    assignee: getSelect(p['担当者']) || null,
    done: p['完了']?.checkbox ?? false,
    due_date: p['期限']?.date?.start ?? null,
    notes: getText(p['備考']) || null,
    ref_id: getText(p['関連先ID']) || null,
    ref_type: getSelect(p['関連先タイプ']) || null,
    office: getSelect(p['拠点']) || null,
    created_at: page.created_time,
  }
}

export function toProcess(page: any) {
  if (!isFullPage(page)) return null
  const p = page.properties as any
  return {
    id: page.id,
    name: getTitle(p['工程名']),
    planned_start: p['予定開始日']?.date?.start ?? null,
    planned_end: p['予定終了日']?.date?.start ?? null,
    actual_start: p['実績開始日']?.date?.start ?? null,
    actual_end: p['実績終了日']?.date?.start ?? null,
    status: getStatus(p['工程ステータス']) || null,
    assignee: getSelect(p['担当者']) || null,
    done: p['完了チェック']?.checkbox ?? false,
    related_project_id: p['関連工事']?.relation?.[0]?.id ?? null,
    created_at: page.created_time,
  }
}

export function toNotice(page: any) {
  if (!isFullPage(page)) return null
  const p = page.properties as any
  return {
    id: page.id,
    title: getTitle(p['タイトル']),
    content: getText(p['内容']) || null,
    date: p['日付']?.date?.start ?? null,
    poster: getSelect(p['投稿者']) || null,
    confirmed_by: getMultiSelect(p['確認者リスト']),
    office: getSelect(p['拠点']) || null,
    created_at: page.created_time,
  }
}

export function toContact(page: any) {
  if (!isFullPage(page)) return null
  const p = page.properties as any
  return {
    id: page.id,
    subject: getTitle(p['件名']),
    recipients: getMultiSelect(p['宛先']),
    content: getText(p['内容']) || null,
    poster: getSelect(p['投稿者']) || null,
    date: p['日付']?.date?.start ?? null,
    office: getSelect(p['拠点']) || null,
    confirmed: p['確認済み']?.checkbox ?? false,
    confirmed_by: getMultiSelect(p['確認者リスト']),
    created_at: page.created_time,
  }
}

export function toEstimateRevision(page: any) {
  if (!isFullPage(page)) return null
  const p = page.properties as any
  return {
    id: page.id,
    version_name: getTitle(p['版名']),
    estimate_id: getText(p['見積ID']) || null,
    drive_url: p['Google Drive URL']?.url ?? null,
    registered_date: p['登録日']?.date?.start ?? null,
    memo: getText(p['メモ']) || null,
    created_at: page.created_time,
  }
}

export function cors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

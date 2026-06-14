import express from 'express'
import cors from 'cors'
import { Client, isFullPage } from '@notionhq/client'

const app = express()
const notion = new Client({ auth: process.env.NOTION_TOKEN })

// Notion database IDs（都南建設 既存DB）
const PROJECTS_DB = '4e8426e7a4d1480f8efa956b3643cdb2'
const REPORTS_DB  = 'a5f67b8bb359497c989cf397d8eb345a'

app.use(cors())
app.use(express.json())

// ── Property helpers ─────────────────────────────────────────
function title(prop: any): string {
  return prop?.title?.map((t: any) => t.plain_text).join('') ?? ''
}
function text(prop: any): string {
  return prop?.rich_text?.map((t: any) => t.plain_text).join('') ?? ''
}
function select(prop: any): string {
  return prop?.select?.name ?? ''
}
function status(prop: any): string {
  return prop?.status?.name ?? ''
}

function toProject(page: any) {
  if (!isFullPage(page)) return null
  const p = page.properties as any
  return {
    id: page.id,
    name: title(p['工事名']),
    client_name: text(p['お客様名']),
    location: text(p['現場住所']),
    status: status(p['工事ステータス']),
    start_date: p['工期']?.date?.start ?? null,
    end_date: p['工期']?.date?.end ?? null,
    contract_amount: p['契約金額']?.number ?? null,
    assignee: select(p['担当者']),
    type: select(p['工事種別']),
    created_at: page.created_time,
    notion_url: page.url,
  }
}

function toReport(page: any, projectMap: Record<string, any> = {}) {
  if (!isFullPage(page)) return null
  const p = page.properties as any
  const projectId = p['関連工事']?.relation?.[0]?.id ?? null
  return {
    id: page.id,
    title: title(p['日報タイトル']),
    project_id: projectId,
    project: projectId ? projectMap[projectId] ?? null : null,
    report_date: p['日付']?.date?.start ?? null,
    weather: select(p['天気']),
    workers_count: p['作業人数']?.number ?? null,
    work_content: text(p['今日やった作業']),
    tomorrow: text(p['明日やること']),
    notes: text(p['社長・担当者への確認事項']),
    trouble: p['トラブル']?.checkbox ?? false,
    check_status: status(p['確認ステータス']),
    assignee: select(p['担当者']),
    created_at: page.created_time,
    notion_url: page.url,
  }
}

async function buildProjectMap(projectIds: string[]): Promise<Record<string, any>> {
  if (projectIds.length === 0) return {}
  const pages = await Promise.all(
    projectIds.map(id => notion.pages.retrieve({ page_id: id }).catch(() => null))
  )
  const map: Record<string, any> = {}
  for (const page of pages) {
    if (!page || !isFullPage(page)) continue
    const proj = toProject(page)
    if (proj) map[proj.id] = { id: proj.id, name: proj.name }
  }
  return map
}

// ── Projects ─────────────────────────────────────────────────
app.get('/api/projects', async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: PROJECTS_DB,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    })
    res.json(response.results.map(toProject).filter(Boolean))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/projects/:id', async (req, res) => {
  try {
    const page = await notion.pages.retrieve({ page_id: req.params.id })
    res.json(toProject(page))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/projects', async (req, res) => {
  try {
    const { name, client_name, location, status: st, start_date, end_date, contract_amount, type, assignee } = req.body
    const props: any = {
      '工事名': { title: [{ text: { content: name ?? '' } }] },
    }
    if (client_name) props['お客様名'] = { rich_text: [{ text: { content: client_name } }] }
    if (location) props['現場住所'] = { rich_text: [{ text: { content: location } }] }
    if (st) props['工事ステータス'] = { status: { name: st } }
    if (start_date) props['工期'] = { date: { start: start_date, end: end_date ?? null } }
    if (contract_amount != null) props['契約金額'] = { number: contract_amount }
    if (type) props['工事種別'] = { select: { name: type } }
    if (assignee) props['担当者'] = { select: { name: assignee } }

    const page = await notion.pages.create({ parent: { database_id: PROJECTS_DB }, properties: props })
    res.json(toProject(page))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/projects/:id', async (req, res) => {
  try {
    const { name, client_name, location, status: st, start_date, end_date, contract_amount, type, assignee } = req.body
    const props: any = {}
    if (name) props['工事名'] = { title: [{ text: { content: name } }] }
    if (client_name != null) props['お客様名'] = { rich_text: [{ text: { content: client_name } }] }
    if (location != null) props['現場住所'] = { rich_text: [{ text: { content: location } }] }
    if (st) props['工事ステータス'] = { status: { name: st } }
    if (start_date !== undefined) props['工期'] = { date: { start: start_date, end: end_date ?? null } }
    if (contract_amount != null) props['契約金額'] = { number: contract_amount }
    if (type) props['工事種別'] = { select: { name: type } }
    if (assignee) props['担当者'] = { select: { name: assignee } }

    const page = await notion.pages.update({ page_id: req.params.id, properties: props })
    res.json(toProject(page))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/projects/:id', async (req, res) => {
  try {
    await notion.pages.update({ page_id: req.params.id, archived: true })
    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ── Reports ──────────────────────────────────────────────────
app.get('/api/reports', async (req, res) => {
  try {
    const filter: any = {}
    if (req.query.project_id) {
      filter.filter = { property: '関連工事', relation: { contains: req.query.project_id as string } }
    }
    const response = await notion.databases.query({
      database_id: REPORTS_DB,
      sorts: [{ property: '日付', direction: 'descending' }],
      ...filter,
    })
    const reports = response.results
    const projectIds = [...new Set(
      reports.map((r: any) => r.properties?.['関連工事']?.relation?.[0]?.id).filter(Boolean)
    )] as string[]
    const projectMap = await buildProjectMap(projectIds)
    res.json(reports.map(r => toReport(r, projectMap)).filter(Boolean))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/reports/:id', async (req, res) => {
  try {
    const page = await notion.pages.retrieve({ page_id: req.params.id })
    if (!isFullPage(page)) return res.status(404).json({ error: 'not found' })
    const projectId = (page.properties as any)['関連工事']?.relation?.[0]?.id ?? null
    const projectMap = await buildProjectMap(projectId ? [projectId] : [])
    res.json(toReport(page, projectMap))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/reports', async (req, res) => {
  try {
    const { title: t, project_id, report_date, weather, workers_count, work_content, tomorrow, notes, trouble, assignee } = req.body
    const props: any = {
      '日報タイトル': { title: [{ text: { content: t ?? '' } }] },
    }
    if (report_date) props['日付'] = { date: { start: report_date } }
    if (weather) props['天気'] = { select: { name: weather } }
    if (workers_count != null) props['作業人数'] = { number: workers_count }
    if (work_content) props['今日やった作業'] = { rich_text: [{ text: { content: work_content } }] }
    if (tomorrow) props['明日やること'] = { rich_text: [{ text: { content: tomorrow } }] }
    if (notes) props['社長・担当者への確認事項'] = { rich_text: [{ text: { content: notes } }] }
    if (trouble != null) props['トラブル'] = { checkbox: trouble }
    if (assignee) props['担当者'] = { select: { name: assignee } }
    if (project_id) props['関連工事'] = { relation: [{ id: project_id }] }

    const page = await notion.pages.create({ parent: { database_id: REPORTS_DB }, properties: props })
    res.json(toReport(page))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/reports/:id', async (req, res) => {
  try {
    const { title: t, project_id, report_date, weather, workers_count, work_content, tomorrow, notes, trouble, assignee } = req.body
    const props: any = {}
    if (t != null) props['日報タイトル'] = { title: [{ text: { content: t } }] }
    if (report_date !== undefined) props['日付'] = { date: { start: report_date } }
    if (weather) props['天気'] = { select: { name: weather } }
    if (workers_count != null) props['作業人数'] = { number: workers_count }
    if (work_content != null) props['今日やった作業'] = { rich_text: [{ text: { content: work_content } }] }
    if (tomorrow != null) props['明日やること'] = { rich_text: [{ text: { content: tomorrow } }] }
    if (notes != null) props['社長・担当者への確認事項'] = { rich_text: [{ text: { content: notes } }] }
    if (trouble != null) props['トラブル'] = { checkbox: trouble }
    if (assignee) props['担当者'] = { select: { name: assignee } }
    if (project_id !== undefined) props['関連工事'] = project_id ? { relation: [{ id: project_id }] } : { relation: [] }

    const page = await notion.pages.update({ page_id: req.params.id, properties: props })
    res.json(toReport(page))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/reports/:id', async (req, res) => {
  try {
    await notion.pages.update({ page_id: req.params.id, archived: true })
    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => console.log(`✅ API server → http://localhost:${PORT}`))

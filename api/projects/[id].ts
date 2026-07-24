import type { VercelRequest, VercelResponse } from '@vercel/node'
import { notion, toProject, cors } from '../_lib'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const id = req.query.id as string

  if (req.method === 'GET') {
    const page = await notion.pages.retrieve({ page_id: id })
    return res.json(toProject(page))
  }

  if (req.method === 'PATCH') {
    const { name, client_name, location, status, start_date, end_date, contract_amount, type, assignee, category, division, contract_date, contact, change_amount, billing_date, payment_date, notes, progress, progress_date, office } = req.body
    const props: any = {}
    if (name) props['工事名'] = { title: [{ text: { content: name } }] }
    if (client_name != null) props['お客様名'] = { rich_text: [{ text: { content: client_name } }] }
    if (location != null) props['現場住所'] = { rich_text: [{ text: { content: location } }] }
    if (status) props['工事ステータス'] = { status: { name: status } }
    if (start_date !== undefined) props['工期'] = start_date ? { date: { start: start_date, end: end_date || null } } : { date: null }
    if (contract_amount != null) props['契約金額'] = { number: contract_amount }
    if (type) props['工事種別'] = { select: { name: type } }
    if (assignee) props['担当者'] = { select: { name: assignee } }
    if (category !== undefined) props['工事分類'] = category ? { select: { name: category } } : { select: null }
    if (division !== undefined) props['工事区分'] = division ? { select: { name: division } } : { select: null }
    if (contract_date !== undefined) props['契約日'] = contract_date ? { date: { start: contract_date } } : { date: null }
    if (contact !== undefined) props['連絡先'] = { phone_number: contact || null }
    if (change_amount !== undefined) props['増減金額'] = change_amount != null ? { number: change_amount } : { number: null }
    if (billing_date !== undefined) props['請求日'] = billing_date ? { date: { start: billing_date } } : { date: null }
    if (payment_date !== undefined) props['入金日'] = payment_date ? { date: { start: payment_date } } : { date: null }
    if (notes !== undefined) props['備考'] = { rich_text: notes ? [{ text: { content: notes } }] : [] }
    // 進行率(0〜100%)はNotionでは0〜1で保持するため÷100して保存
    if (progress !== undefined) props['進行率'] = progress != null ? { number: progress / 100 } : { number: null }
    if (progress_date !== undefined) props['進捗更新日'] = progress_date ? { date: { start: progress_date } } : { date: null }
    if (office !== undefined) props['拠点'] = office ? { select: { name: office } } : { select: null }
    const page = await notion.pages.update({ page_id: id, properties: props })
    return res.json(toProject(page))
  }

  if (req.method === 'DELETE') {
    await notion.pages.update({ page_id: id, archived: true })
    return res.json({ ok: true })
  }

  res.status(405).end()
}

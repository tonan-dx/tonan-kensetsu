import type { Task } from '../types'
import { PLAN_REF } from './plan'

/**
 * 金曜会議まわりのタスクDB相乗り。いずれも /api/checklist を流用（新API不要）。
 * - 議題: ref_type='議題', ref_id=会議日(YYYY-MM-DD), name=内容, 担当者=提案者, 完了=議論済み, 期限=(任意)議題の日付
 * - 資格: ref_type='資格', name=資格名, 備考=詳細, 期限=(任意)試験日 … 会議に紐づかない共通リスト
 * - 車検: ref_type='車検', name=車種, 関連先ID=車番, 期限=車検日, 備考=備考 … 会議に紐づかない共通リスト
 */
export const AGENDA_REF = '議題'
export const QUALIFICATION_REF = '資格'
export const VEHICLE_REF = '車検'

export function isAgenda(t: Pick<Task, 'ref_type'>): boolean { return t.ref_type === AGENDA_REF }
export function isQualification(t: Pick<Task, 'ref_type'>): boolean { return t.ref_type === QUALIFICATION_REF }
export function isVehicle(t: Pick<Task, 'ref_type'>): boolean { return t.ref_type === VEHICLE_REF }

/** ホーム・担当者別のタスク一覧から除外すべき会議関連アイテムか */
export function isMeetingItem(t: Pick<Task, 'ref_type'>): boolean {
  return isAgenda(t) || isQualification(t) || isVehicle(t)
}

/** ローカル日付を YYYY-MM-DD で返す */
export function localYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 車検日が「近い」とみなす日数（この日数以内で色を変えて強調する） */
export const VEHICLE_SOON_DAYS = 60

/** 今日から指定日までの残り日数。日付なしは null、過去日はマイナス。 */
export function daysUntil(ymd: string | null | undefined): number | null {
  if (!ymd) return null
  const today = new Date(localYMD(new Date()))
  const target = new Date(ymd)
  if (Number.isNaN(target.getTime())) return null
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

/** 残り日数の表示ラベル（例: あと45日 / 今日 / 12日超過） */
export function countdownLabel(days: number): string {
  if (days < 0) return `${-days}日超過`
  if (days === 0) return '今日'
  return `あと${days}日`
}

/** 車検の表示名（例: 9012 2tDT 3転） */
export function vehicleTitle(t: Pick<Task, 'name' | 'ref_id'>): string {
  return [t.ref_id, t.name].filter(Boolean).join(' ')
}

/** 今週の金曜日（今日が金曜なら今日、過ぎていれば今週分）を YYYY-MM-DD で返す */
export function thisFriday(): string {
  const d = new Date()
  d.setDate(d.getDate() + (5 - d.getDay()))
  return localYMD(d)
}

/** 会議日の表示ラベル（例: 2026年7月24日(金)） */
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
export function formatMeetingDate(ymd: string): string {
  const [y, m, day] = ymd.split('-').map(Number)
  if (!y || !m || !day) return ymd
  const w = WEEKDAYS[new Date(y, m - 1, day).getDay()]
  return `${y}年${m}月${day}日(${w})`
}

/** 議題・資格・車検の日付付き項目をカレンダー（予定）に登録する */
export async function addToCalendar(params: {
  name: string
  date: string
  assignee?: string | null
  time?: string | null
  office?: string | null
}): Promise<boolean> {
  const res = await fetch('/api/checklist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: params.name,
      assignee: params.assignee || null,
      due_date: params.date,
      ref_type: PLAN_REF,
      ref_id: params.time || undefined,
      office: params.office ?? null,
    }),
  }).catch(() => null)
  return !!res && res.ok
}

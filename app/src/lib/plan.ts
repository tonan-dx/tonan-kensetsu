import type { Task } from '../types'

/** 予定（会議・行事など）はタスクDBに ref_type='予定' で相乗り保存。ref_id に時間(HH:MM)を格納。 */
export const PLAN_REF = '予定'

export function isPlan(t: Pick<Task, 'ref_type'>): boolean {
  return t.ref_type === PLAN_REF
}

/** カレンダー表示ラベル：時間 内容（対象者） */
export function planLabel(name: string, time: string | null, assignee: string | null): string {
  const t = time ? `${time} ` : ''
  const who = assignee ? `（${assignee}）` : ''
  return `${t}${name}${who}`
}

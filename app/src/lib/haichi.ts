import type { Task } from '../types'

/**
 * 現場配置表。1コマ = 担当者 × 日付 × 工事 をタスクDBに ref_type='配置' で相乗り保存（新API不要）。
 * - ref_id(関連先ID) = 担当者名（配置表の名簿。app全体の担当者selectは汚さないよう text に入れる）
 * - 期限(due_date)   = 配置する日付
 * - タスク名(name)   = 表示ラベル（工事名 または '休み'）
 * - 備考(notes)      = 実体の値：工事ページID / REST_VAL('__rest__')
 * 休みの「全体休み」はカレンダーの会社休み（[[leave]] の isCompanyLeave）を読み、配置表に重ねて表示する。
 */
export const HAICHI_REF = '配置'
export const REST_VAL = '__rest__'

export function isHaichi(t: Pick<Task, 'ref_type'>): boolean {
  return t.ref_type === HAICHI_REF
}

/** カレンダーのToDo等に出したくない「内部コンテナ」系の ref_type */
export const CONTAINER_REFS = new Set(['配置', 'メモ', '議題', '資格', '車検'])

export function localYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 今週の月曜（週の起点）。配置表は月曜始まりの2週間ウィンドウ。 */
export function mondayOf(d: Date): Date {
  const x = new Date(d)
  const wd = x.getDay()               // 0=日..6=土
  const diff = (wd === 0 ? -6 : 1 - wd) // 月曜へ
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

/** 起点日から days 日ぶんの [YYYY-MM-DD, 週末フラグ] を返す */
export function windowDates(start: Date, days: number): Array<[string, boolean]> {
  const out: Array<[string, boolean]> = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const wd = d.getDay()
    out.push([localYMD(d), wd === 0 || wd === 6])
  }
  return out
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
export function shortDate(ymd: string): string {
  const [, m, d] = ymd.split('-').map(Number)
  return `${m}/${d}`
}
export function weekdayOf(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return WEEKDAYS[new Date(y, m - 1, d).getDay()]
}

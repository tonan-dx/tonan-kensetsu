import type { Project } from '../types'

/** ステータス表示の色（バッジクラス）。真実の源はここ1か所。'請求済' は派生表示用。 */
export const STATUS_COLORS: Record<string, string> = {
  '着工前': 'badge-gray',
  '進行中': 'badge-blue',
  '確認待ち': 'badge-gray',
  '完了': 'badge-green',
  '請求待ち': 'badge-orange',
  '請求済': 'badge-purple',
  '入金済み': 'badge-green',
}

/**
 * 表示用ステータス。
 * Notion上のステータスは変更せず、「請求待ち」かつ請求日ありのとき見た目だけ「請求済」にする。
 * （完了→請求待ち→(請求日入力で)請求済→入金済み という運用を、既存ステータスのまま表現する）
 */
export function displayStatus(p: Pick<Project, 'status' | 'billing_date'>): string {
  if (p.status === '請求待ち' && p.billing_date) return '請求済'
  return p.status
}

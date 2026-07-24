import type { Task } from '../types'

/** 金曜会議の議題はタスクDBに ref_type='議題' で相乗り保存（name=議題本文、担当者=提案者、完了=議論済み）。 */
export const AGENDA_REF = '議題'

export function isAgenda(t: Pick<Task, 'ref_type'>): boolean {
  return t.ref_type === AGENDA_REF
}

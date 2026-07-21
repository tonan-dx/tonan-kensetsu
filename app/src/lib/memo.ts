import type { Task } from '../types'

/** メモ（工事の覚え書き）はタスクDBに ref_type='メモ' で相乗り保存（ref_id=関連工事ID、name=本文）。 */
export const MEMO_REF = 'メモ'

export function isMemo(t: Pick<Task, 'ref_type'>): boolean {
  return t.ref_type === MEMO_REF
}

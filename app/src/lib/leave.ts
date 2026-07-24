import type { Task } from '../types'

/** 休みはタスクDBに ref_type='休み' で相乗り保存する。ref_id に "種別|半休" を格納。 */
export const LEAVE_REF = '休み'

export const LEAVE_KINDS = ['事前', '当日'] as const
export const LEAVE_HALVES = ['全日', '午前', '午後'] as const
export type LeaveKind = typeof LEAVE_KINDS[number]
export type LeaveHalf = typeof LEAVE_HALVES[number]

/** 休みの対象者候補（工事管理の担当者と同じ並び） */
export const MEMBERS = ['長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '山崎', '幹子', '佐野', '上野', '岩洞', '小笠原']

export function isLeave(t: Pick<Task, 'ref_type'>): boolean {
  return t.ref_type === LEAVE_REF
}

/** 会社全体の休み（全体休み）。ref_type='休み' + ref_id='会社休み'（対象者なし）で表す。 */
export const COMPANY_LEAVE = '会社休み'
export function isCompanyLeave(t: Pick<Task, 'ref_type' | 'ref_id'>): boolean {
  return isLeave(t) && t.ref_id === COMPANY_LEAVE
}

export function encodeLeave(kind: LeaveKind, half: LeaveHalf): string {
  return `${kind}|${half}`
}

export function parseLeave(refId: string | null): { kind: LeaveKind; half: LeaveHalf } {
  const [kind, half] = (refId ?? '').split('|')
  return {
    kind: kind === '当日' ? '当日' : '事前',
    half: half === '午前' || half === '午後' ? half : '全日',
  }
}

/** カレンダー表示ラベル。半休は「午前休/午後休」。 */
export function leaveLabel(member: string, half: LeaveHalf): string {
  return half === '全日' ? `${member} 休み` : `${member} ${half}休`
}

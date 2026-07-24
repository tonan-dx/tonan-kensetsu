import { useEffect, useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import type { Task } from '../types'
import type { OfficeFilter } from '../lib/office'
import {
  MEMBERS, LEAVE_KINDS, LEAVE_HALVES, LEAVE_REF,
  encodeLeave, parseLeave, leaveLabel, COMPANY_LEAVE, isCompanyLeave,
} from '../lib/leave'
import type { LeaveKind, LeaveHalf } from '../lib/leave'

interface Props {
  defaultDate: string           // 'yyyy-MM-dd'
  loc: OfficeFilter
  onClose: () => void
  onChanged: () => void         // カレンダー側の再取得
}

export default function LeaveModal({ defaultDate, loc, onClose, onChanged }: Props) {
  const [mode, setMode] = useState<'individual' | 'company'>('individual')
  const [member, setMember] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [kind, setKind] = useState<LeaveKind>('事前')
  const [half, setHalf] = useState<LeaveHalf>('全日')
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [leaves, setLeaves] = useState<Task[]>([])

  // 選択中の日付の休み一覧を取得
  const loadLeaves = (d: string) => {
    fetch(`/api/checklist?ref_type=${encodeURIComponent(LEAVE_REF)}`)
      .then(r => r.json())
      .then((all: Task[]) => {
        const list = Array.isArray(all) ? all.filter(t => (t.due_date ?? '').slice(0, 10) === d) : []
        setLeaves(list)
      })
      .catch(() => setLeaves([]))
  }
  useEffect(() => { loadLeaves(date) }, [date])

  const add = async () => {
    if (saving) return
    if (mode === 'individual' && !member) return
    setSaving(true)
    const body = mode === 'company'
      ? {
          name: '会社休み',
          due_date: date,
          ref_type: LEAVE_REF,
          ref_id: COMPANY_LEAVE,
          notes: memo || undefined,
          office: loc === 'all' ? null : loc,
        }
      : {
          name: half === '全日' ? '休み' : `休み(${half})`,
          assignee: member,
          due_date: date,
          ref_type: LEAVE_REF,
          ref_id: encodeLeave(kind, half),
          notes: memo || undefined,
          office: loc === 'all' ? null : loc,
        }
    const res = await fetch('/api/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null)
    setSaving(false)
    if (!res || !res.ok) { alert('休みの登録に失敗しました。もう一度お試しください。'); return }
    setMember(''); setMemo(''); setHalf('全日'); setKind('事前')
    loadLeaves(date)
    onChanged()
  }

  const remove = async (id: string) => {
    await fetch(`/api/checklist/${id}`, { method: 'DELETE' }).catch(() => null)
    loadLeaves(date)
    onChanged()
  }

  return (
    <div className="cal-modal-overlay" onClick={onClose}>
      <div className="cal-modal" onClick={e => e.stopPropagation()}>
        <div className="cal-modal-head">
          <h2>休み登録</h2>
          <button className="cal-modal-close" onClick={onClose} aria-label="閉じる"><X size={20} /></button>
        </div>

        <div className="cal-modal-body">
          <label className="form-label">休みの種類</label>
          <div className="chip-group">
            <button type="button" className={`chip-opt${mode === 'individual' ? ' active' : ''}`}
              onClick={() => setMode('individual')}>個人の休み</button>
            <button type="button" className={`chip-opt${mode === 'company' ? ' active' : ''}`}
              onClick={() => setMode('company')}>会社の休み（全体）</button>
          </div>

          <label className="form-label">日付</label>
          <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />

          {mode === 'individual' ? (
            <>
              <label className="form-label">対象者</label>
              <div className="chip-group">
                {MEMBERS.map(m => (
                  <button key={m} type="button"
                    className={`chip-opt${member === m ? ' active' : ''}`}
                    onClick={() => setMember(m)}>{m}</button>
                ))}
              </div>

              <label className="form-label">種別</label>
              <div className="chip-group">
                {LEAVE_KINDS.map(k => (
                  <button key={k} type="button"
                    className={`chip-opt${kind === k ? ' active' : ''}`}
                    onClick={() => setKind(k)}>{k === '事前' ? '事前（前もって）' : '当日'}</button>
                ))}
              </div>

              <label className="form-label">半休</label>
              <div className="chip-group">
                {LEAVE_HALVES.map(h => (
                  <button key={h} type="button"
                    className={`chip-opt${half === h ? ' active' : ''}`}
                    onClick={() => setHalf(h)}>{h}</button>
                ))}
              </div>
            </>
          ) : (
            <p className="form-hint">
              会社全体のお休みとして登録します（対象者の指定は不要）。
              {loc === 'all' ? '全拠点に表示されます。' : `「${loc}」に表示されます（拠点を切り替えて登録すると拠点ごとに設定できます）。`}
            </p>
          )}

          <label className="form-label">{mode === 'company' ? '名目・メモ（任意）' : '理由・メモ（任意）'}</label>
          <input className="form-input" value={memo} onChange={e => setMemo(e.target.value)}
            placeholder={mode === 'company' ? '例：お盆休み / 創立記念日' : '例：通院'} />

          <button className="btn-submit" onClick={add} disabled={saving || (mode === 'individual' && !member)}>
            {saving ? '登録中...' : (mode === 'company' ? 'この日を会社休みに登録' : 'この休みを登録')}
          </button>

          <div className="cal-modal-list-title">この日の休み（{leaves.length}件）</div>
          {leaves.length === 0 ? (
            <p className="cal-modal-empty">まだ登録がありません</p>
          ) : (
            <div className="cal-modal-list">
              {leaves.map(t => {
                if (isCompanyLeave(t)) {
                  return (
                    <div key={t.id} className="cal-modal-leave-row">
                      <span className="cal-modal-leave-name" style={{ fontWeight: 700, color: '#e11d48' }}>会社休み（全体）</span>
                      {t.notes && <span className="cal-modal-leave-memo">{t.notes}</span>}
                      <button className="cal-modal-leave-del" onClick={() => remove(t.id)} aria-label="削除"><Trash2 size={14} /></button>
                    </div>
                  )
                }
                const { kind: k, half: h } = parseLeave(t.ref_id)
                return (
                  <div key={t.id} className="cal-modal-leave-row">
                    <span className="cal-modal-leave-name">{leaveLabel(t.assignee ?? '', h)}</span>
                    <span className="cal-modal-leave-tag">{k}</span>
                    {t.notes && <span className="cal-modal-leave-memo">{t.notes}</span>}
                    <button className="cal-modal-leave-del" onClick={() => remove(t.id)} aria-label="削除"><Trash2 size={14} /></button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

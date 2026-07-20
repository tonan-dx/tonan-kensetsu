import { useEffect, useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import type { Task } from '../types'
import type { OfficeFilter } from '../lib/office'
import { MEMBERS } from '../lib/leave'
import { PLAN_REF, planLabel } from '../lib/plan'

interface Props {
  defaultDate: string           // 'yyyy-MM-dd'
  loc: OfficeFilter
  onClose: () => void
  onChanged: () => void
}

const WHO_OPTIONS = ['全体', ...MEMBERS]

export default function PlanModal({ defaultDate, loc, onClose, onChanged }: Props) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('')
  const [who, setWho] = useState('全体')
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [plans, setPlans] = useState<Task[]>([])

  const loadPlans = (d: string) => {
    fetch(`/api/checklist?ref_type=${encodeURIComponent(PLAN_REF)}`)
      .then(r => r.json())
      .then((all: Task[]) => {
        setPlans(Array.isArray(all) ? all.filter(t => (t.due_date ?? '').slice(0, 10) === d) : [])
      })
      .catch(() => setPlans([]))
  }
  useEffect(() => { loadPlans(date) }, [date])

  const add = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    const res = await fetch('/api/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: title.trim(),
        assignee: who === '全体' ? null : who,
        due_date: date,
        ref_type: PLAN_REF,
        ref_id: time || undefined,
        notes: memo || undefined,
        office: loc === 'all' ? null : loc,
      }),
    }).catch(() => null)
    setSaving(false)
    if (!res || !res.ok) { alert('予定の登録に失敗しました。もう一度お試しください。'); return }
    setTitle(''); setTime(''); setWho('全体'); setMemo('')
    loadPlans(date)
    onChanged()
  }

  const remove = async (id: string) => {
    await fetch(`/api/checklist/${id}`, { method: 'DELETE' }).catch(() => null)
    loadPlans(date)
    onChanged()
  }

  return (
    <div className="cal-modal-overlay" onClick={onClose}>
      <div className="cal-modal" onClick={e => e.stopPropagation()}>
        <div className="cal-modal-head">
          <h2>予定登録</h2>
          <button className="cal-modal-close" onClick={onClose} aria-label="閉じる"><X size={20} /></button>
        </div>

        <div className="cal-modal-body">
          <label className="form-label">内容 *</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="例：安全大会 / 全体会議" autoFocus />

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">日付</label>
              <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">時間（任意）</label>
              <input type="time" className="form-input" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          <label className="form-label">対象者</label>
          <div className="chip-group">
            {WHO_OPTIONS.map(w => (
              <button key={w} type="button"
                className={`chip-opt${who === w ? ' active' : ''}`}
                onClick={() => setWho(w)}>{w}</button>
            ))}
          </div>

          <label className="form-label">メモ（任意）</label>
          <input className="form-input" value={memo} onChange={e => setMemo(e.target.value)} placeholder="場所・持ち物など" />

          <button className="btn-submit" onClick={add} disabled={!title.trim() || saving}>
            {saving ? '登録中...' : 'この予定を登録'}
          </button>

          <div className="cal-modal-list-title">この日の予定（{plans.length}件）</div>
          {plans.length === 0 ? (
            <p className="cal-modal-empty">まだ登録がありません</p>
          ) : (
            <div className="cal-modal-list">
              {plans.map(t => (
                <div key={t.id} className="cal-modal-leave-row">
                  <span className="cal-modal-leave-name">{planLabel(t.name, t.ref_id, t.assignee)}</span>
                  {t.notes && <span className="cal-modal-leave-memo">{t.notes}</span>}
                  <button className="cal-modal-leave-del" onClick={() => remove(t.id)} aria-label="削除"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

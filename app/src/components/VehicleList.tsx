import { useEffect, useState } from 'react'
import { Car, Plus, Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import type { Task } from '../types'
import { useOfficeFilter } from '../lib/office'
import { VEHICLE_REF, VEHICLE_SOON_DAYS, daysUntil, countdownLabel, isCompleted } from '../lib/meeting'

interface Draft { plate: string; model: string; date: string; done: string; note: string; office: string }
const EMPTY: Draft = { plate: '', model: '', date: '', done: '', note: '', office: '' }

export default function VehicleList() {
  const { loc } = useOfficeFilter()
  const [items, setItems] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [edit, setEdit] = useState<Draft>(EMPTY)
  const [showDone, setShowDone] = useState(false)

  const load = () => {
    fetch(`/api/checklist?ref_type=${encodeURIComponent(VEHICLE_REF)}`)
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // 共通リスト：拠点なし(全社共通)は常に表示、拠点ありは全社/その拠点で表示
  const inScope = items
    .filter(t => !t.office || loc === 'all' || t.office === loc)
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
  // 完了日を入れた車検は一覧から外す（「済ませた車検」で見返せる）
  const visible = inScope.filter(t => !isCompleted(t))
  const finished = inScope.filter(isCompleted)
    .sort((a, b) => (b.completed_date ?? '').localeCompare(a.completed_date ?? ''))

  const bodyOf = (d: Draft) => ({
    name: d.model.trim() || '(車種未入力)',
    ref_id: d.plate.trim() || undefined,
    due_date: d.date || undefined,
    completed_date: d.done || undefined,
    notes: d.note.trim() || undefined,
    ref_type: VEHICLE_REF,
    office: d.office || null,
  })

  const add = async () => {
    if (!draft.plate.trim() && !draft.model.trim()) return
    setSaving(true)
    const created = await fetch('/api/checklist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyOf(draft)),
    }).then(r => r.json()).catch(() => null)
    if (created) setItems(prev => [...prev, created])
    setDraft(EMPTY); setAdding(false); setSaving(false)
  }

  const saveEdit = async (id: string) => {
    setSaving(true)
    const updated = await fetch(`/api/checklist/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: edit.model.trim() || '(車種未入力)',
        due_date: edit.date || null,
        completed_date: edit.done || null,
        notes: edit.note.trim() || null,
        office: edit.office || null,
      }),
    }).then(r => r.json()).catch(() => null)
    // 車番(関連先ID/ref_id)はPATCH未対応のため作成時のみ。表示は既存値を維持
    if (updated) setItems(prev => prev.map(t => t.id === id ? { ...updated, ref_id: t.ref_id } : t))
    setEditId(null); setSaving(false)
  }

  const remove = async (id: string) => {
    if (!confirm('この車両を一覧から削除しますか？')) return
    await fetch(`/api/checklist/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(t => t.id !== id))
  }

  // 1台ぶんの行。ふだんの一覧と「済ませた車検」で同じ見た目を使う
  const row = (t: Task) => {
    if (editId === t.id) {
      return (
        <div key={t.id} className="task-item editing">
          <input className="task-input" value={edit.model} onChange={e => setEdit(d => ({ ...d, model: e.target.value }))} placeholder="車種" />
          <div className="meeting-field-row">
            <label className="meeting-field-label">車検日</label>
            <input type="date" className="task-date" value={edit.date} onChange={e => setEdit(d => ({ ...d, date: e.target.value }))} />
            <select className="task-select" value={edit.office} onChange={e => setEdit(d => ({ ...d, office: e.target.value }))}>
              <option value="">拠点なし</option><option value="本社">本社</option><option value="釜石">釜石</option>
            </select>
          </div>
          <div className="meeting-field-row">
            <label className="meeting-field-label">完了日</label>
            <input type="date" className="task-date" value={edit.done} onChange={e => setEdit(d => ({ ...d, done: e.target.value }))} />
            <span className="vehicle-done-hint">入れると一覧から外れます（空にすると戻ります）</span>
          </div>
          <input className="task-input" value={edit.note} onChange={e => setEdit(d => ({ ...d, note: e.target.value }))} placeholder="備考" />
          <div className="meeting-field-row">
            <button className="task-save-btn" onClick={() => saveEdit(t.id)} disabled={saving}>{saving ? '...' : '保存'}</button>
            <button className="task-cancel-btn" onClick={() => setEditId(null)}>×</button>
          </div>
        </div>
      )
    }
    const done = isCompleted(t)
    const du = daysUntil(t.due_date)
    // 済ませた車検は「あと◯日／◯日経過」を出さない（済んでいるのに急かさない）
    const soon = !done && du != null && du <= VEHICLE_SOON_DAYS
    const over = !done && du != null && du < 0
    return (
      <div key={t.id} className={`vehicle-row${soon ? ' soon' : ''}${over ? ' over' : ''}${done ? ' finished' : ''}`}>
        <div className="vehicle-main">
          {t.ref_id && <span className="vehicle-plate">{t.ref_id}</span>}
          <span className="vehicle-model">{t.name}</span>
          {t.office && <span className="badge badge-gray">{t.office}</span>}
        </div>
        <div className="vehicle-sub">
          {t.due_date && (
            <span className={`vehicle-date${over ? ' over' : soon ? ' soon' : ''}`}>
              車検 {t.due_date.replace(/-/g, '/')}{!done && du != null && `（${countdownLabel(du)}）`}
            </span>
          )}
          {done && <span className="vehicle-done">✓ 完了 {t.completed_date!.replace(/-/g, '/')}</span>}
          {t.notes && <span className="vehicle-note">{t.notes}</span>}
        </div>
        <div className="meeting-row-actions">
          <button className="task-edit" onClick={() => startEdit(t)} title="編集"><Pencil size={13} /></button>
          <button className="task-delete" onClick={() => remove(t.id)}><Trash2 size={14} /></button>
        </div>
      </div>
    )
  }

  const startEdit = (t: Task) => {
    setEditId(t.id)
    setEdit({ plate: t.ref_id ?? '', model: t.name ?? '', date: t.due_date ?? '', done: t.completed_date ?? '', note: t.notes ?? '', office: t.office ?? '' })
  }

  return (
    <div className="detail-section-card">
      <div className="task-list-header">
        <div className="task-list-title"><Car size={16} /> 車検一覧 <span className="task-count">{visible.length}件</span></div>
        <button className="task-add-btn" onClick={() => setAdding(a => !a)}><Plus size={16} /> 追加</button>
      </div>
      <div className="vehicle-hint">車検日を入れると、カレンダーにも自動で表示されます。済んだら<b>完了日</b>を入れると一覧から外れます（「済ませた車検」で見返せます）</div>

      {adding && (
        <div className="task-add-form">
          <div className="meeting-field-row">
            <input className="task-input flex1" placeholder="車番（例：9012）" value={draft.plate} onChange={e => setDraft(d => ({ ...d, plate: e.target.value }))} />
            <input className="task-input flex2" placeholder="車種（例：2tDT 3転）" value={draft.model} onChange={e => setDraft(d => ({ ...d, model: e.target.value }))} />
          </div>
          <div className="meeting-field-row">
            <label className="meeting-field-label">車検日</label>
            <input type="date" className="task-date" value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} />
            <select className="task-select" value={draft.office} onChange={e => setDraft(d => ({ ...d, office: e.target.value }))}>
              <option value="">拠点なし</option><option value="本社">本社</option><option value="釜石">釜石</option>
            </select>
          </div>
          <div className="meeting-field-row">
            <label className="meeting-field-label">完了日</label>
            <input type="date" className="task-date" value={draft.done} onChange={e => setDraft(d => ({ ...d, done: e.target.value }))} />
            <span className="vehicle-done-hint">入れると一覧から外れます</span>
          </div>
          <input className="task-input" placeholder="備考（例：ダンプ切替修理完了）" value={draft.note} onChange={e => setDraft(d => ({ ...d, note: e.target.value }))} />
          <div className="meeting-field-row">
            <button className="task-save-btn" onClick={add} disabled={saving}>{saving ? '...' : '保存'}</button>
            <button className="task-cancel-btn" onClick={() => { setAdding(false); setDraft(EMPTY) }}>×</button>
          </div>
        </div>
      )}

      {loading ? <div className="task-loading">読み込み中...</div> : (
        <>
          {visible.length === 0 && finished.length === 0 && !adding && (
            <div className="task-empty">車両がありません</div>
          )}

          {visible.length > 0 && <div className="task-items">{visible.map(row)}</div>}

          {/* 済ませた車検（完了日あり）。ふだんは畳んでおき、見返したいときだけ開く */}
          {finished.length > 0 && (
            <div className="task-done-section">
              <button className="task-done-toggle" onClick={() => setShowDone(s => !s)}>
                {showDone ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                済ませた車検 {finished.length}件
              </button>
              {showDone && <div className="task-items done">{finished.map(row)}</div>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

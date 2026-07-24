import { useEffect, useState } from 'react'
import { GraduationCap, Plus, Trash2, Pencil, CalendarPlus, Check } from 'lucide-react'
import type { Task } from '../types'
import { QUALIFICATION_REF, addToCalendar } from '../lib/meeting'

interface Draft { name: string; detail: string; date: string }
const EMPTY: Draft = { name: '', detail: '', date: '' }

export default function QualificationList() {
  const [items, setItems] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [edit, setEdit] = useState<Draft>(EMPTY)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const load = () => {
    fetch(`/api/checklist?ref_type=${encodeURIComponent(QUALIFICATION_REF)}`)
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // 資格は全社共通。試験日の近い順（未設定は末尾）
  const visible = [...items].sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))

  const add = async () => {
    if (!draft.name.trim()) return
    setSaving(true)
    const created = await fetch('/api/checklist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: draft.name.trim(),
        notes: draft.detail.trim() || undefined,
        due_date: draft.date || undefined,
        ref_type: QUALIFICATION_REF,
        office: null,
      }),
    }).then(r => r.json()).catch(() => null)
    if (created) setItems(prev => [...prev, created])
    setDraft(EMPTY); setAdding(false); setSaving(false)
  }

  const saveEdit = async (id: string) => {
    setSaving(true)
    const updated = await fetch(`/api/checklist/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: edit.name.trim() || '(資格名未入力)',
        notes: edit.detail.trim() || null,
        due_date: edit.date || null,
      }),
    }).then(r => r.json()).catch(() => null)
    if (updated) setItems(prev => prev.map(t => t.id === id ? updated : t))
    setEditId(null); setSaving(false)
  }

  const remove = async (id: string) => {
    if (!confirm('この資格試験を一覧から削除しますか？')) return
    await fetch(`/api/checklist/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(t => t.id !== id))
  }

  const toCalendar = async (t: Task) => {
    if (!t.due_date) return
    const ok = await addToCalendar({ name: `試験：${t.name}`, date: t.due_date })
    if (ok) setAddedIds(prev => new Set(prev).add(t.id))
  }

  const startEdit = (t: Task) => {
    setEditId(t.id)
    setEdit({ name: t.name ?? '', detail: t.notes ?? '', date: t.due_date ?? '' })
  }

  return (
    <div className="detail-section-card">
      <div className="task-list-header">
        <div className="task-list-title"><GraduationCap size={16} /> 資格試験一覧 <span className="task-count">{visible.length}件</span></div>
        <button className="task-add-btn" onClick={() => setAdding(a => !a)}><Plus size={16} /> 追加</button>
      </div>

      {adding && (
        <div className="task-add-form">
          <input className="task-input" placeholder="資格名（例：1級土木）" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} autoFocus />
          <input className="task-input" placeholder="詳細（願書販売・申込期間・試験日など）" value={draft.detail} onChange={e => setDraft(d => ({ ...d, detail: e.target.value }))} />
          <div className="meeting-field-row">
            <label className="meeting-field-label">試験日（任意）</label>
            <input type="date" className="task-date" value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} />
            <button className="task-save-btn" onClick={add} disabled={!draft.name.trim() || saving}>{saving ? '...' : '保存'}</button>
            <button className="task-cancel-btn" onClick={() => { setAdding(false); setDraft(EMPTY) }}>×</button>
          </div>
        </div>
      )}

      {loading ? <div className="task-loading">読み込み中...</div> : visible.length === 0 && !adding ? (
        <div className="task-empty">資格試験がありません</div>
      ) : (
        <div className="task-items">
          {visible.map(t => {
            if (editId === t.id) {
              return (
                <div key={t.id} className="task-item editing">
                  <input className="task-input" value={edit.name} onChange={e => setEdit(d => ({ ...d, name: e.target.value }))} placeholder="資格名" />
                  <input className="task-input" value={edit.detail} onChange={e => setEdit(d => ({ ...d, detail: e.target.value }))} placeholder="詳細" />
                  <div className="meeting-field-row">
                    <label className="meeting-field-label">試験日</label>
                    <input type="date" className="task-date" value={edit.date} onChange={e => setEdit(d => ({ ...d, date: e.target.value }))} />
                    <button className="task-save-btn" onClick={() => saveEdit(t.id)} disabled={saving}>{saving ? '...' : '保存'}</button>
                    <button className="task-cancel-btn" onClick={() => setEditId(null)}>×</button>
                  </div>
                </div>
              )
            }
            return (
              <div key={t.id} className="qual-row">
                <div className="qual-main">
                  <span className="qual-name">{t.name}</span>
                  {t.due_date && <span className="qual-date">試験 {t.due_date.replace(/-/g, '/')}</span>}
                </div>
                {t.notes && <div className="qual-detail">{t.notes}</div>}
                <div className="meeting-row-actions">
                  {t.due_date && (
                    <button className="meeting-cal-btn" onClick={() => toCalendar(t)} disabled={addedIds.has(t.id)} title="試験日をカレンダーに登録">
                      {addedIds.has(t.id) ? <Check size={14} /> : <CalendarPlus size={14} />}
                    </button>
                  )}
                  <button className="task-edit" onClick={() => startEdit(t)} title="編集"><Pencil size={13} /></button>
                  <button className="task-delete" onClick={() => remove(t.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

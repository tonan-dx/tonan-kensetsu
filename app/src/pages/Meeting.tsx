import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, MessageSquare, FileText, CheckSquare, Square, Trash2, Users } from 'lucide-react'
import type { Task, Notice } from '../types'
import { useOfficeFilter, matchesOffice } from '../lib/office'
import { useRefetchOnFocus } from '../lib/useRefetchOnFocus'
import { AGENDA_REF } from '../lib/agenda'

const MEMBERS = ['長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '山崎', '幹子', '佐野', '上野', '岩洞', '小笠原']
const MEMBER_COUNT = MEMBERS.length

export default function Meeting() {
  const { loc } = useOfficeFilter()
  const [agenda, setAgenda] = useState<Task[]>([])
  const [minutes, setMinutes] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)

  // 議題の新規入力
  const [newText, setNewText] = useState('')
  const [newProposer, setNewProposer] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    Promise.all([
      fetch(`/api/checklist?ref_type=${encodeURIComponent(AGENDA_REF)}`).then(r => r.json()).catch(() => []),
      fetch('/api/notices?kind=minutes').then(r => r.json()).catch(() => []),
    ]).then(([a, m]) => {
      setAgenda(Array.isArray(a) ? a : [])
      setMinutes(Array.isArray(m) ? m : [])
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [])
  useRefetchOnFocus(load)

  const visibleAgenda = agenda.filter(t => matchesOffice(t.office, loc))
  const pending = visibleAgenda.filter(t => !t.done)
  const discussed = visibleAgenda.filter(t => t.done)
  const visibleMinutes = minutes.filter(n => matchesOffice(n.office, loc))

  const addAgenda = async () => {
    if (!newText.trim() || saving) return
    setSaving(true)
    const created = await fetch('/api/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newText.trim(),
        assignee: newProposer || null,
        ref_type: AGENDA_REF,
        office: loc === 'all' ? null : loc,
      }),
    }).then(r => r.json()).catch(() => null)
    if (created) setAgenda(prev => [...prev, created])
    setNewText('')
    setNewProposer('')
    setSaving(false)
  }

  const toggleAgenda = async (t: Task) => {
    const updated = await fetch(`/api/checklist/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !t.done }),
    }).then(r => r.json()).catch(() => null)
    if (updated) setAgenda(prev => prev.map(x => x.id === t.id ? updated : x))
  }

  const deleteAgenda = async (t: Task) => {
    if (!confirm('この議題を削除しますか？')) return
    await fetch(`/api/checklist/${t.id}`, { method: 'DELETE' })
    setAgenda(prev => prev.filter(x => x.id !== t.id))
  }

  const renderAgendaItem = (t: Task) => (
    <div className={`task-item${t.done ? ' done' : ''}`} key={t.id}>
      <button className="task-check" onClick={() => toggleAgenda(t)} title={t.done ? '議論済み' : '未議論'}>
        {t.done ? <CheckSquare size={18} color="#16a34a" /> : <Square size={18} color="#94a3b8" />}
      </button>
      <div className="task-info" style={{ flex: 1 }}>
        <span className="task-name">{t.name}</span>
        {t.assignee && <div className="task-meta"><span className="task-assignee">提案：{t.assignee}</span></div>}
      </div>
      <button className="task-delete" onClick={() => deleteAgenda(t)}><Trash2 size={14} /></button>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">金曜会議</h1>
      </div>

      {/* 議題 */}
      <div className="detail-section-card">
        <div className="task-list-header">
          <div className="task-list-title">
            <MessageSquare size={16} />
            今週の議題
            <span className="task-count">{pending.length}件</span>
          </div>
        </div>

        <div className="task-add-form">
          <input
            className="task-input"
            placeholder="話し合いたいこと（議題）を入力..."
            value={newText}
            onChange={e => setNewText(e.target.value)}
          />
          <div className="task-add-row">
            <select className="task-select" value={newProposer} onChange={e => setNewProposer(e.target.value)}>
              <option value="">提案者</option>
              {MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button className="task-save-btn" onClick={addAgenda} disabled={!newText.trim() || saving}>
              {saving ? '...' : <><Plus size={14} /> 追加</>}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="task-loading">読み込み中...</div>
        ) : (
          <>
            {pending.length === 0 && discussed.length === 0 && (
              <div className="task-empty">議題はまだありません</div>
            )}
            <div className="task-items">{pending.map(renderAgendaItem)}</div>
            {discussed.length > 0 && (
              <div className="task-done-section">
                <div className="task-done-toggle" style={{ cursor: 'default' }}>議論済み {discussed.length}件</div>
                <div className="task-items done">{discussed.map(renderAgendaItem)}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 議事録 */}
      <div className="detail-section-card">
        <div className="task-list-header">
          <div className="task-list-title">
            <FileText size={16} />
            議事録
            <span className="task-count">{visibleMinutes.length}件</span>
          </div>
          <Link to="/meeting/minutes/new" className="task-add-btn">
            <Plus size={16} /> アップ
          </Link>
        </div>

        {loading ? (
          <div className="task-loading">読み込み中...</div>
        ) : visibleMinutes.length === 0 ? (
          <div className="task-empty">議事録はまだありません</div>
        ) : (
          <div className="card-list">
            {visibleMinutes.map(n => {
              const confirmed = n.confirmed_by?.length ?? 0
              const unseen = MEMBER_COUNT - confirmed
              return (
                <Link to={`/meeting/minutes/${n.id}`} key={n.id} className="card notice-card">
                  <div className="notice-card-header">
                    {n.date && <span className="notice-date">{n.date}</span>}
                    {n.office && <span className="notice-loc">{n.office}</span>}
                    {n.poster && <span className="notice-poster">{n.poster}</span>}
                    <span className={`notice-unseen${unseen === 0 ? ' done' : ''}`}>
                      <Users size={12} /> {unseen === 0 ? '全員確認済' : `未確認 ${unseen}名`}
                    </span>
                  </div>
                  <div className="notice-card-title">{n.title}</div>
                  {n.content && <div className="notice-card-preview">{n.content}</div>}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, MessageSquare, FileText, CheckSquare, Square, Trash2, CalendarPlus, Check, Users } from 'lucide-react'
import type { Task, Notice } from '../types'
import { useOfficeFilter } from '../lib/office'
import { useRefetchOnFocus } from '../lib/useRefetchOnFocus'
import { AGENDA_REF, addToCalendar, formatMeetingDate } from '../lib/meeting'
import VehicleList from '../components/VehicleList'
import QualificationList from '../components/QualificationList'

const MEMBERS = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤']
const MEMBER_COUNT = MEMBERS.length

export default function MeetingDetail() {
  const { date = '' } = useParams()
  const navigate = useNavigate()
  const { loc } = useOfficeFilter()

  const [agenda, setAgenda] = useState<Task[]>([])
  const [minutes, setMinutes] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)

  const [newText, setNewText] = useState('')
  const [newProposer, setNewProposer] = useState('')
  const [newDate, setNewDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [addedCal, setAddedCal] = useState<Set<string>>(new Set())

  const load = () => {
    Promise.all([
      fetch(`/api/checklist?ref_type=${encodeURIComponent(AGENDA_REF)}&ref_id=${encodeURIComponent(date)}`).then(r => r.json()).catch(() => []),
      fetch('/api/notices?kind=minutes').then(r => r.json()).catch(() => []),
    ]).then(([a, m]: [Task[], Notice[]]) => {
      setAgenda(Array.isArray(a) ? a : [])
      setMinutes(Array.isArray(m) ? m.filter(n => (n.date ?? '').slice(0, 10) === date) : [])
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [date])
  useRefetchOnFocus(load)

  const pending = agenda.filter(t => !t.done)
  const discussed = agenda.filter(t => t.done)

  const addAgenda = async () => {
    if (!newText.trim() || saving) return
    setSaving(true)
    const created = await fetch('/api/checklist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newText.trim(),
        assignee: newProposer || null,
        due_date: newDate || undefined,
        ref_type: AGENDA_REF,
        ref_id: date,
        office: loc === 'all' ? null : loc,
      }),
    }).then(r => r.json()).catch(() => null)
    if (created) setAgenda(prev => [...prev, created])
    setNewText(''); setNewProposer(''); setNewDate(''); setSaving(false)
  }

  const toggle = async (t: Task) => {
    const updated = await fetch(`/api/checklist/${t.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !t.done }),
    }).then(r => r.json()).catch(() => null)
    if (updated) setAgenda(prev => prev.map(x => x.id === t.id ? updated : x))
  }

  const remove = async (t: Task) => {
    if (!confirm('この議題を削除しますか？')) return
    await fetch(`/api/checklist/${t.id}`, { method: 'DELETE' })
    setAgenda(prev => prev.filter(x => x.id !== t.id))
  }

  const toCalendar = async (t: Task) => {
    if (!t.due_date) return
    const ok = await addToCalendar({ name: t.name, date: t.due_date, assignee: t.assignee, office: t.office })
    if (ok) setAddedCal(prev => new Set(prev).add(t.id))
  }

  const renderAgenda = (t: Task) => (
    <div className={`task-item${t.done ? ' done' : ''}`} key={t.id}>
      <button className="task-check" onClick={() => toggle(t)} title={t.done ? '議論済み' : '未議論'}>
        {t.done ? <CheckSquare size={18} color="#16a34a" /> : <Square size={18} color="#94a3b8" />}
      </button>
      <div className="task-info" style={{ flex: 1 }}>
        <span className="task-name">{t.name}</span>
        <div className="task-meta">
          {t.assignee && <span className="task-assignee">提案：{t.assignee}</span>}
          {t.due_date && <span className="task-due">{t.due_date.replace(/-/g, '/').slice(5)}</span>}
        </div>
      </div>
      {t.due_date && (
        <button className="meeting-cal-btn" onClick={() => toCalendar(t)} disabled={addedCal.has(t.id)} title="カレンダーに登録">
          {addedCal.has(t.id) ? <Check size={14} /> : <CalendarPlus size={14} />}
        </button>
      )}
      <button className="task-delete" onClick={() => remove(t)}><Trash2 size={14} /></button>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/meeting')}><ArrowLeft size={20} /></button>
        <h1 className="page-title">{formatMeetingDate(date)} 会議</h1>
      </div>

      {/* 打ち合わせ内容（議題） */}
      <div className="detail-section-card">
        <div className="task-list-header">
          <div className="task-list-title"><MessageSquare size={16} /> 打ち合わせ内容 <span className="task-count">{pending.length}件</span></div>
        </div>
        <div className="task-add-form">
          <input className="task-input" placeholder="打ち合わせ内容（議題）を入力..." value={newText} onChange={e => setNewText(e.target.value)} />
          <div className="meeting-field-row">
            <select className="task-select" value={newProposer} onChange={e => setNewProposer(e.target.value)}>
              <option value="">提案者</option>
              {MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <label className="meeting-field-label">日付(任意)</label>
            <input type="date" className="task-date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            <button className="task-save-btn" onClick={addAgenda} disabled={!newText.trim() || saving}>{saving ? '...' : '追加'}</button>
          </div>
          <p className="task-add-hint">日付を入れた議題は、あとで「カレンダーに登録」ボタンで予定に飛ばせます。</p>
        </div>

        {loading ? <div className="task-loading">読み込み中...</div> : (
          <>
            {pending.length === 0 && discussed.length === 0 && <div className="task-empty">議題はまだありません</div>}
            <div className="task-items">{pending.map(renderAgenda)}</div>
            {discussed.length > 0 && (
              <div className="task-done-section">
                <div className="task-done-toggle" style={{ cursor: 'default' }}>議論済み {discussed.length}件</div>
                <div className="task-items done">{discussed.map(renderAgenda)}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 議事録 */}
      <div className="detail-section-card">
        <div className="task-list-header">
          <div className="task-list-title"><FileText size={16} /> 議事録 <span className="task-count">{minutes.length}件</span></div>
          <Link to={`/meeting/minutes/new?date=${date}`} className="task-add-btn"><Plus size={16} /> アップ</Link>
        </div>
        {loading ? <div className="task-loading">読み込み中...</div> : minutes.length === 0 ? (
          <div className="task-empty">議事録はまだありません</div>
        ) : (
          <div className="card-list">
            {minutes.map(n => {
              const unseen = MEMBER_COUNT - (n.confirmed_by?.length ?? 0)
              return (
                <Link to={`/meeting/minutes/${n.id}`} key={n.id} className="card notice-card">
                  <div className="notice-card-header">
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

      {/* 毎週出る共通リスト */}
      <QualificationList />
      <VehicleList />
    </div>
  )
}

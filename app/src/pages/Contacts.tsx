import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Send, Check, CheckCircle2, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import type { Contact } from '../types'
import { useOfficeFilter, matchesOffice } from '../lib/office'

const MEMBERS = ['長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '山崎', '幹子', '佐野', '上野', '岩洞', '小笠原']

export default function Contacts() {
  const navigate = useNavigate()
  const { loc } = useOfficeFilter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTo, setFilterTo] = useState('')
  const [showDone, setShowDone] = useState(false)

  useEffect(() => {
    fetch('/api/contacts').then(r => r.json()).then(data => {
      setContacts(Array.isArray(data) ? data : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const toggleConfirm = async (c: Contact) => {
    const updated = await fetch(`/api/contacts/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: !c.confirmed }),
    }).then(r => r.json()).catch(() => null)
    if (updated) setContacts(prev => prev.map(x => x.id === c.id ? updated : x))
  }

  const remove = async (c: Contact) => {
    if (!confirm('この連絡を削除しますか？')) return
    await fetch(`/api/contacts/${c.id}`, { method: 'DELETE' })
    setContacts(prev => prev.filter(x => x.id !== c.id))
  }

  const visible = contacts
    .filter(c => matchesOffice(c.office, loc))
    .filter(c => !filterTo || c.recipients.includes(filterTo))

  const active = visible.filter(c => !c.confirmed)
  const done = visible.filter(c => c.confirmed)

  const renderCard = (c: Contact) => (
    <div key={c.id} className={`card contact-card${c.confirmed ? ' confirmed' : ''}`}>
      <div className="contact-card-head">
        <div className="contact-recipients">
          {c.recipients.length === 0 ? <span className="contact-to-empty">宛先なし</span>
            : c.recipients.map(r => <span key={r} className="contact-to-chip">{r}</span>)}
        </div>
        {c.office && <span className="contact-loc">{c.office}</span>}
      </div>
      <div className="contact-card-title">{c.subject}</div>
      {c.content && <div className="contact-card-body">{c.content}</div>}
      <div className="contact-card-foot">
        <span className="contact-meta">
          {c.poster && <span>{c.poster}</span>}
          {c.date && <span>{c.date}</span>}
        </span>
        <div className="contact-actions">
          <button
            className={`contact-confirm${c.confirmed ? ' done' : ''}`}
            onClick={() => toggleConfirm(c)}
            title={c.confirmed ? '確認済み（戻す）' : '確認済みにする'}
          >
            {c.confirmed ? <CheckCircle2 size={16} /> : <Check size={16} />}
            {c.confirmed ? '確認済み' : '確認'}
          </button>
          <button className="contact-icon-btn" onClick={() => navigate(`/contacts/${c.id}/edit`)} title="編集"><Pencil size={14} /></button>
          <button className="contact-icon-btn danger" onClick={() => remove(c)} title="削除"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">連絡（報連相）</h1>
        <Link to="/contacts/new" className="btn-primary">
          <Plus size={18} /> 新規
        </Link>
      </div>

      <div className="contact-filter">
        <select className="form-select" value={filterTo} onChange={e => setFilterTo(e.target.value)}>
          <option value="">宛先で絞る（全員）</option>
          {MEMBERS.map(m => <option key={m} value={m}>{m} 宛て</option>)}
        </select>
      </div>

      {loading ? <div className="loading">読み込み中...</div> : (
        <div className="card-list">
          {active.length === 0 && done.length === 0 && (
            <div className="notice-empty">
              <Send size={32} className="notice-empty-icon" />
              <p>連絡はありません</p>
            </div>
          )}

          {active.length === 0 && done.length > 0 && (
            <p className="empty-text">未確認の連絡はありません</p>
          )}

          {active.map(renderCard)}

          {done.length > 0 && (
            <div className="task-done-section">
              <button className="task-done-toggle" onClick={() => setShowDone(s => !s)}>
                {showDone ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                確認済み {done.length}件
              </button>
              {showDone && done.map(renderCard)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

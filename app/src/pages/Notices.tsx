import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Bell, ChevronDown, ChevronUp } from 'lucide-react'
import type { Notice } from '../types'
import { useOfficeFilter, matchesOffice } from '../lib/office'
import { useRefetchOnFocus } from '../lib/useRefetchOnFocus'
import { MEMBERS } from '../lib/leave'

export default function Notices() {
  const { loc } = useOfficeFilter()
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [showDone, setShowDone] = useState(false)

  const load = () => {
    fetch('/api/notices').then(r => r.json()).then(data => {
      setNotices(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [])
  useRefetchOnFocus(load)

  const visible = notices.filter(n => matchesOffice(n.office, loc))
  // まだ回覧を確認していない人（名前で出して、誰が見ていないかをはっきりさせる）
  const unseenOf = (n: Notice) => {
    const confirmed = n.confirmed_by ?? []
    return MEMBERS.filter(m => !confirmed.includes(m))
  }
  const active = visible.filter(n => unseenOf(n).length > 0)
  const done = visible.filter(n => unseenOf(n).length === 0)

  const renderCard = (n: Notice) => {
    const unseen = unseenOf(n)
    return (
      <Link to={`/notices/${n.id}`} key={n.id} className="card notice-card">
        <div className="notice-card-header">
          {n.date && <span className="notice-date">{n.date}</span>}
          {n.office && <span className="notice-loc">{n.office}</span>}
          {n.poster && <span className="notice-poster">{n.poster}</span>}
          {unseen.length > 0
            ? <span className="notice-unseen">未確認 {unseen.length}名</span>
            : <span className="notice-unseen done">全員確認済</span>}
        </div>
        <div className="notice-card-title">{n.title}</div>
        {n.content && <div className="notice-card-preview">{n.content}</div>}
        {unseen.length > 0 && (
          <div className="notice-unseen-names">
            <span className="lbl">見ていない人</span>{unseen.join('、')}
          </div>
        )}
      </Link>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">お知らせ</h1>
        <Link to="/notices/new" className="btn-primary">
          <Plus size={18} /> 新規
        </Link>
      </div>

      {loading ? <div className="loading">読み込み中...</div> : (
        <div className="card-list">
          {active.length === 0 && done.length === 0 && (
            <div className="notice-empty">
              <Bell size={32} className="notice-empty-icon" />
              <p>お知らせはありません</p>
            </div>
          )}

          {active.length === 0 && done.length > 0 && (
            <p className="empty-text">未確認のお知らせはありません</p>
          )}

          {active.map(renderCard)}

          {done.length > 0 && (
            <div className="task-done-section">
              <button className="task-done-toggle" onClick={() => setShowDone(s => !s)}>
                {showDone ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                全員確認済み {done.length}件
              </button>
              {showDone && done.map(renderCard)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

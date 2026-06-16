import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Bell } from 'lucide-react'
import type { Notice } from '../types'

export default function Notices() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notices').then(r => r.json()).then(data => {
      setNotices(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

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
          {notices.length === 0 ? (
            <div className="notice-empty">
              <Bell size={32} className="notice-empty-icon" />
              <p>お知らせはありません</p>
            </div>
          ) : notices.map(n => (
            <Link to={`/notices/${n.id}`} key={n.id} className="card notice-card">
              <div className="notice-card-header">
                {n.date && <span className="notice-date">{n.date}</span>}
                {n.poster && <span className="notice-poster">{n.poster}</span>}
              </div>
              <div className="notice-card-title">{n.title}</div>
              {n.content && <div className="notice-card-preview">{n.content}</div>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

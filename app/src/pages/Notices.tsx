import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Bell } from 'lucide-react'
import type { Notice } from '../types'
import { useOfficeFilter, matchesOffice } from '../lib/office'

const MEMBER_COUNT = 16

export default function Notices() {
  const { loc } = useOfficeFilter()
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notices').then(r => r.json()).then(data => {
      setNotices(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  const visible = notices.filter(n => matchesOffice(n.office, loc))

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
          {visible.length === 0 ? (
            <div className="notice-empty">
              <Bell size={32} className="notice-empty-icon" />
              <p>お知らせはありません</p>
            </div>
          ) : visible.map(n => {
            const unseen = MEMBER_COUNT - (n.confirmed_by?.length ?? 0)
            return (
            <Link to={`/notices/${n.id}`} key={n.id} className="card notice-card">
              <div className="notice-card-header">
                {n.date && <span className="notice-date">{n.date}</span>}
                {n.office && <span className="notice-loc">{n.office}</span>}
                {n.poster && <span className="notice-poster">{n.poster}</span>}
                {unseen > 0
                  ? <span className="notice-unseen">未確認 {unseen}名</span>
                  : <span className="notice-unseen done">全員確認済</span>}
              </div>
              <div className="notice-card-title">{n.title}</div>
              {n.content && <div className="notice-card-preview">{n.content}</div>}
            </Link>
          )})}
        </div>
      )}
    </div>
  )
}

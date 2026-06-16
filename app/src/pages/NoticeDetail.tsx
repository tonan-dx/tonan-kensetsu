import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import type { Notice } from '../types'

export default function NoticeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/notices/${id}`).then(r => r.json()).then(data => {
      setNotice(data)
      setLoading(false)
    })
  }, [id])

  const handleDelete = async () => {
    if (!confirm('このお知らせを削除しますか？')) return
    await fetch(`/api/notices/${id}`, { method: 'DELETE' })
    navigate('/notices')
  }

  if (loading) return <div className="loading">読み込み中...</div>
  if (!notice) return <div className="loading">お知らせが見つかりません</div>

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1 className="page-title" style={{ flex: 1 }}>{notice.title}</h1>
        <div className="header-actions">
          <Link to={`/notices/${id}/edit`} className="btn-icon"><Pencil size={18} /></Link>
          <button className="btn-icon danger" onClick={handleDelete}><Trash2 size={18} /></button>
        </div>
      </div>

      <div className="detail-card">
        {notice.date && (
          <div className="detail-row">
            <span className="detail-label">日付</span>
            <span>{notice.date}</span>
          </div>
        )}
        {notice.poster && (
          <div className="detail-row">
            <span className="detail-label">投稿者</span>
            <span>{notice.poster}</span>
          </div>
        )}
      </div>

      {notice.content && (
        <div className="notice-body-card">
          <p className="notice-body">{notice.content}</p>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, ExternalLink, CheckCircle, Circle } from 'lucide-react'
import type { SafetyRecord } from '../types'

export default function SafetyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState<SafetyRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/safety/${id}`)
      .then(r => r.json())
      .then(data => { setRecord(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!confirm('この安全記録を削除しますか？')) return
    await fetch(`/api/safety/${id}`, { method: 'DELETE' })
    navigate('/safety')
  }

  const toggleConfirmed = async () => {
    if (!record) return
    const updated = await fetch(`/api/safety/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: !record.confirmed }),
    }).then(r => r.json())
    setRecord(updated)
  }

  if (loading) return <div className="loading">読み込み中...</div>
  if (!record) return <div className="loading">記録が見つかりません</div>

  const fields = [
    { label: 'KY活動記録', value: record.ky_activity },
    { label: '安全日誌', value: record.safety_log },
    { label: 'ヒヤリハット', value: record.near_miss },
    { label: '危険箇所', value: record.hazard },
    { label: '是正対応', value: record.corrective_action },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1 className="page-title">{record.title || '安全記録'}</h1>
        <div className="header-actions">
          <Link to={`/safety/${id}/edit`} className="btn-icon"><Pencil size={18} /></Link>
          <button className="btn-icon danger" onClick={handleDelete}><Trash2 size={18} /></button>
        </div>
      </div>

      <div className="detail-card">
        <div className="detail-row">
          <span className="detail-label">確認状況</span>
          <button onClick={toggleConfirmed} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, color: record.confirmed ? '#16a34a' : '#94a3b8' }}>
            {record.confirmed ? <CheckCircle size={18} /> : <Circle size={18} />}
            {record.confirmed ? '確認済み' : '未確認'}
          </button>
        </div>
        {record.date && (
          <div className="detail-row">
            <span className="detail-label">日付</span>
            <span>{record.date}</span>
          </div>
        )}
        {record.project && (
          <div className="detail-row">
            <span className="detail-label">関連工事</span>
            <Link to={`/projects/${record.project_id}`} style={{ color: 'var(--blue)' }}>{record.project.name}</Link>
          </div>
        )}
        {record.recorder && (
          <div className="detail-row">
            <span className="detail-label">記入者</span>
            <span>{record.recorder}</span>
          </div>
        )}
        {record.reviewer && (
          <div className="detail-row">
            <span className="detail-label">確認者</span>
            <span>{record.reviewer}</span>
          </div>
        )}
        <div className="detail-row">
          <span className="detail-label">Notion</span>
          <a href={record.notion_url} target="_blank" rel="noreferrer" className="notion-link">
            Notionで開く <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {fields.filter(f => f.value).map(f => (
        <div key={f.label} className="detail-section-card">
          <div className="detail-section-label">{f.label}</div>
          <div className="detail-body">{f.value}</div>
        </div>
      ))}
    </div>
  )
}

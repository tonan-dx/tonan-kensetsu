import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, ExternalLink } from 'lucide-react'
import type { DailyReport } from '../types'

export default function ReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/reports/${id}`).then(r => r.json()).then(data => {
      setReport(data)
      setLoading(false)
    })
  }, [id])

  const handleDelete = async () => {
    if (!confirm('この日報をアーカイブしますか？')) return
    await fetch(`/api/reports/${id}`, { method: 'DELETE' })
    navigate('/reports')
  }

  if (loading) return <div className="loading">読み込み中...</div>
  if (!report) return <div className="loading">日報が見つかりません</div>

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1 className="page-title">{report.title || report.report_date}</h1>
        <div className="header-actions">
          <Link to={`/reports/${id}/edit`} className="btn-icon"><Pencil size={18} /></Link>
          <button className="btn-icon danger" onClick={handleDelete}><Trash2 size={18} /></button>
        </div>
      </div>

      <div className="detail-card">
        {report.project && (
          <div className="detail-row">
            <span className="detail-label">工事</span>
            <Link to={`/projects/${report.project_id}`} className="notion-link">{report.project.name}</Link>
          </div>
        )}
        <div className="detail-row">
          <span className="detail-label">日付</span>
          <span>{report.report_date}</span>
        </div>
        {report.weather && (
          <div className="detail-row">
            <span className="detail-label">天気</span>
            <span>{report.weather}</span>
          </div>
        )}
        {report.assignee && (
          <div className="detail-row">
            <span className="detail-label">担当者</span>
            <span>{report.assignee}</span>
          </div>
        )}
        {report.workers_count != null && (
          <div className="detail-row">
            <span className="detail-label">作業人数</span>
            <span>{report.workers_count}名</span>
          </div>
        )}
        <div className="detail-row">
          <span className="detail-label">確認状況</span>
          <span>{report.check_status}</span>
        </div>
        {report.trouble && (
          <div className="detail-row">
            <span className="detail-label">トラブル</span>
            <span className="badge badge-red">あり</span>
          </div>
        )}
        <div className="detail-row">
          <span className="detail-label">Notion</span>
          <a href={report.notion_url} target="_blank" rel="noreferrer" className="notion-link">
            Notionで開く <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {report.work_content && (
        <div className="detail-section-card">
          <p className="detail-section-label">今日やった作業</p>
          <p className="detail-body">{report.work_content}</p>
        </div>
      )}
      {report.tomorrow && (
        <div className="detail-section-card">
          <p className="detail-section-label">明日やること</p>
          <p className="detail-body">{report.tomorrow}</p>
        </div>
      )}
      {report.notes && (
        <div className="detail-section-card">
          <p className="detail-section-label">確認事項</p>
          <p className="detail-body issues-text">{report.notes}</p>
        </div>
      )}
    </div>
  )
}

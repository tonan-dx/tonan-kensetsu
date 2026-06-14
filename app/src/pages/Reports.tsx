import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import type { DailyReport } from '../types'

const STATUS_COLORS: Record<string, string> = {
  '未確認': 'badge-red',
  '確認中': 'badge-gray',
  '差し戻し': 'badge-red',
  '確認済み': 'badge-green',
}

export default function Reports() {
  const [reports, setReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports').then(r => r.json()).then(data => {
      setReports(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">日報一覧</h1>
        <Link to="/reports/new" className="btn-primary">
          <Plus size={18} /> 新規
        </Link>
      </div>

      {loading ? <div className="loading">読み込み中...</div> : (
        <div className="card-list">
          {reports.length === 0 ? (
            <p className="empty-text">日報がありません</p>
          ) : reports.map(r => (
            <Link to={`/reports/${r.id}`} key={r.id} className="card">
              <div className="card-row">
                <div className="card-title">{r.title || r.report_date}</div>
                <div className="badge-row">
                  {r.trouble && <span className="badge badge-red">トラブル</span>}
                  <span className={`badge ${STATUS_COLORS[r.check_status] ?? 'badge-gray'}`}>{r.check_status}</span>
                </div>
              </div>
              {r.project?.name && <div className="card-sub">{r.project.name}</div>}
              <div className="card-sub">{r.report_date} {r.weather && `· ${r.weather}`} {r.workers_count != null && `· ${r.workers_count}名`}</div>
              {r.work_content && <div className="card-text">{r.work_content}</div>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

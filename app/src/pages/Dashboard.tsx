import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ClipboardList, AlertCircle } from 'lucide-react'
import type { Project, DailyReport } from '../types'

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [recentReports, setRecentReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/reports').then(r => r.json()),
    ]).then(([p, r]) => {
      setProjects(Array.isArray(p) ? p : [])
      setRecentReports(Array.isArray(r) ? r.slice(0, 3) : [])
      setLoading(false)
    })
  }, [])

  const active = projects.filter(p => p.status === '進行中').length
  const total = projects.length

  if (loading) return <div className="loading">読み込み中...</div>

  return (
    <div className="page">
      <h1 className="page-title">ダッシュボード</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <Building2 size={28} className="stat-icon blue" />
          <div>
            <p className="stat-label">進行中の工事</p>
            <p className="stat-value">{active}<span className="stat-unit">件</span></p>
          </div>
        </div>
        <div className="stat-card">
          <ClipboardList size={28} className="stat-icon green" />
          <div>
            <p className="stat-label">総工事数</p>
            <p className="stat-value">{total}<span className="stat-unit">件</span></p>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">進行中の工事</h2>
          <Link to="/projects" className="link-more">すべて見る</Link>
        </div>
        {projects.filter(p => p.status === '進行中').length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={32} />
            <p>進行中の工事はありません</p>
          </div>
        ) : (
          <div className="card-list">
            {projects.filter(p => p.status === '進行中').map(p => (
              <Link to={`/projects/${p.id}`} key={p.id} className="card">
                <div className="card-title">{p.name}</div>
                <div className="card-sub">{p.client_name} {p.location && `· ${p.location}`}</div>
                {(p.start_date || p.end_date) && (
                  <div className="card-dates">{p.start_date ?? '未定'} → {p.end_date ?? '未定'}</div>
                )}
                {p.assignee && <div className="card-sub">担当: {p.assignee}</div>}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">最近の日報</h2>
          <Link to="/reports" className="link-more">すべて見る</Link>
        </div>
        {recentReports.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={32} />
            <p>日報がありません</p>
          </div>
        ) : (
          <div className="card-list">
            {recentReports.map(r => (
              <Link to={`/reports/${r.id}`} key={r.id} className="card">
                <div className="card-row">
                  <div className="card-title">{r.title || r.report_date}</div>
                  {r.trouble && <span className="badge badge-red">トラブル</span>}
                </div>
                <div className="card-sub">{r.project?.name} {r.report_date && `· ${r.report_date}`}</div>
                {r.work_content && <div className="card-text">{r.work_content}</div>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

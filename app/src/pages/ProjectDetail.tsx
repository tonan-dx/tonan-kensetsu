import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Plus, ExternalLink } from 'lucide-react'
import type { Project, DailyReport } from '../types'
import TaskList from '../components/TaskList'
import PhotoUpload from '../components/PhotoUpload'

const STATUS_COLORS: Record<string, string> = {
  '着工前': 'badge-gray',
  '進行中': 'badge-blue',
  '確認待ち': 'badge-gray',
  '完了': 'badge-green',
  '請求': 'badge-gray',
  '入金済み': 'badge-green',
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [reports, setReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/projects/${id}`).then(r => r.json()),
      fetch(`/api/reports?project_id=${id}`).then(r => r.json()),
    ]).then(([p, r]) => {
      setProject(p)
      setReports(Array.isArray(r) ? r : [])
      setLoading(false)
    })
  }, [id])

  const handleDelete = async () => {
    if (!confirm('この工事をアーカイブしますか？')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    navigate('/projects')
  }

  if (loading) return <div className="loading">読み込み中...</div>
  if (!project) return <div className="loading">工事が見つかりません</div>

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1 className="page-title">{project.name}</h1>
        <div className="header-actions">
          <Link to={`/projects/${id}/edit`} className="btn-icon"><Pencil size={18} /></Link>
          <button className="btn-icon danger" onClick={handleDelete}><Trash2 size={18} /></button>
        </div>
      </div>

      <div className="detail-card">
        <div className="detail-row">
          <span className="detail-label">ステータス</span>
          <span className={`badge ${STATUS_COLORS[project.status] ?? 'badge-gray'}`}>{project.status}</span>
        </div>
        {project.client_name && (
          <div className="detail-row">
            <span className="detail-label">お客様名</span>
            <span>{project.client_name}</span>
          </div>
        )}
        {project.location && (
          <div className="detail-row">
            <span className="detail-label">現場住所</span>
            <span>{project.location}</span>
          </div>
        )}
        {project.assignee && (
          <div className="detail-row">
            <span className="detail-label">担当者</span>
            <span>{project.assignee}</span>
          </div>
        )}
        {project.type && (
          <div className="detail-row">
            <span className="detail-label">工事種別</span>
            <span>{project.type}</span>
          </div>
        )}
        {(project.start_date || project.end_date) && (
          <div className="detail-row">
            <span className="detail-label">工期</span>
            <span>{project.start_date ?? '未定'} → {project.end_date ?? '未定'}</span>
          </div>
        )}
        {project.contract_amount != null && (
          <div className="detail-row">
            <span className="detail-label">契約金額</span>
            <span>¥{project.contract_amount.toLocaleString()}</span>
          </div>
        )}
        <div className="detail-row">
          <span className="detail-label">Notion</span>
          <a href={project.notion_url} target="_blank" rel="noreferrer" className="notion-link">
            Notionで開く <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {id && <PhotoUpload refId={id} refType="project" />}
      {id && <TaskList refId={id} refType="project" />}

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">日報</h2>
          <Link to={`/reports/new?project_id=${id}`} className="btn-sm">
            <Plus size={14} /> 追加
          </Link>
        </div>
        {reports.length === 0 ? (
          <p className="empty-text">日報がありません</p>
        ) : (
          <div className="card-list">
            {reports.map(r => (
              <Link to={`/reports/${r.id}`} key={r.id} className="card">
                <div className="card-row">
                  <div className="card-title">{r.title || r.report_date}</div>
                  {r.trouble && <span className="badge badge-red">トラブル</span>}
                </div>
                <div className="card-sub">{r.report_date} {r.weather && `· ${r.weather}`} {r.workers_count != null && `· ${r.workers_count}名`}</div>
                {r.work_content && <div className="card-text">{r.work_content}</div>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import type { Project, ProjectStatus } from '../types'

const STATUS_COLORS: Record<string, string> = {
  '着工前': 'badge-gray',
  '進行中': 'badge-blue',
  '確認待ち': 'badge-gray',
  '完了': 'badge-green',
  '請求': 'badge-gray',
  '入金済み': 'badge-green',
}

const STATUSES: Array<ProjectStatus | 'すべて'> = ['すべて', '着工前', '進行中', '確認待ち', '完了', '請求', '入金済み']

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'すべて'>('すべて')

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      setProjects(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  const filtered = projects.filter(p => {
    const matchSearch = p.name.includes(search) || p.client_name.includes(search) || p.location.includes(search)
    const matchStatus = filterStatus === 'すべて' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">工事一覧</h1>
        <Link to="/projects/new" className="btn-primary">
          <Plus size={18} /> 新規
        </Link>
      </div>

      <div className="search-bar">
        <Search size={16} className="search-icon" />
        <input
          className="search-input"
          placeholder="工事名・お客様名で検索"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-tabs">
        {STATUSES.map(s => (
          <button
            key={s}
            className={`filter-tab ${filterStatus === s ? 'active' : ''}`}
            onClick={() => setFilterStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? <div className="loading">読み込み中...</div> : (
        <div className="card-list">
          {filtered.length === 0 ? (
            <p className="empty-text">工事がありません</p>
          ) : filtered.map(p => (
            <Link to={`/projects/${p.id}`} key={p.id} className="card">
              <div className="card-row">
                <div className="card-title">{p.name}</div>
                <span className={`badge ${STATUS_COLORS[p.status] ?? 'badge-gray'}`}>{p.status}</span>
              </div>
              {p.client_name && <div className="card-sub">{p.client_name}</div>}
              {p.location && <div className="card-sub">{p.location}</div>}
              {p.assignee && <div className="card-sub">担当: {p.assignee}</div>}
              {(p.start_date || p.end_date) && (
                <div className="card-dates">{p.start_date ?? '未定'} → {p.end_date ?? '未定'}</div>
              )}
              {p.contract_amount != null && (
                <div className="card-amount">¥{p.contract_amount.toLocaleString()}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

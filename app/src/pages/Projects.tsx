import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, GanttChart } from 'lucide-react'
import type { Project, ProjectStatus, ProjectCategory } from '../types'

const STATUS_COLORS: Record<string, string> = {
  '着工前': 'badge-gray',
  '進行中': 'badge-blue',
  '確認待ち': 'badge-gray',
  '完了': 'badge-green',
  '請求': 'badge-gray',
  '入金済み': 'badge-green',
}

const STATUSES: Array<ProjectStatus | 'すべて'> = ['すべて', '着工前', '進行中', '確認待ち', '完了', '請求', '入金済み']
const CATEGORIES: ProjectCategory[] = ['民間', '公共', '下請', '修繕', '積水ハウス建設']

// 7月始まりの年度を返す（例: 2024年7月〜2025年6月 → 2024）
function getFiscalYear(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return m >= 7 ? y : y - 1
}

function fiscalYearLabel(fy: number): string {
  return `${fy}年度`
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'すべて'>('すべて')
  const [filterYear, setFilterYear] = useState<number | 'すべて'>('すべて')
  const [filterCategory, setFilterCategory] = useState<ProjectCategory | null>(null)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      setProjects(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  // 存在する年度を降順で列挙
  const fiscalYears = Array.from(
    new Set(projects.map(p => getFiscalYear(p.start_date ?? p.created_at)).filter((y): y is number => y !== null))
  ).sort((a, b) => b - a)

  const filtered = projects.filter(p => {
    const matchSearch = p.name.includes(search) || p.client_name.includes(search) || p.location.includes(search)
    const matchStatus = filterStatus === 'すべて' || p.status === filterStatus
    const matchYear = filterYear === 'すべて' || getFiscalYear(p.start_date ?? p.created_at) === filterYear
    const matchCategory = !filterCategory || (p.category === filterCategory && p.status !== '入金済み')
    return matchSearch && matchStatus && matchYear && matchCategory
  })

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">工事一覧</h1>
        <Link to="/timeline" className="btn-sm">
          <GanttChart size={15} /> 工程
        </Link>
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

      {/* 工事分類タグ（クリックで未入金のみ表示） */}
      <div className="filter-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`filter-tab ${filterCategory === cat ? 'active' : ''}`}
            onClick={() => {
              setFilterCategory(filterCategory === cat ? null : cat)
              if (filterCategory !== cat) setFilterStatus('すべて')
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 年度タブ */}
      {fiscalYears.length > 0 && (
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterYear === 'すべて' ? 'active' : ''}`}
            onClick={() => setFilterYear('すべて')}
          >
            すべて
          </button>
          {fiscalYears.map(fy => (
            <button
              key={fy}
              className={`filter-tab ${filterYear === fy ? 'active' : ''}`}
              onClick={() => setFilterYear(fy)}
            >
              {fiscalYearLabel(fy)}
            </button>
          ))}
        </div>
      )}

      {/* ステータスタブ */}
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

      {filterCategory && (
        <p className="filter-notice">
          「{filterCategory}」の未入金工事を表示中 — {filtered.length}件
        </p>
      )}

      {loading ? <div className="loading">読み込み中...</div> : (
        <div className="card-list">
          {filtered.length === 0 ? (
            <p className="empty-text">工事がありません</p>
          ) : filtered.map(p => (
            <Link to={`/projects/${p.id}`} key={p.id} className="card project-row-card">
              <div className="project-row-main">
                <span className={`badge ${STATUS_COLORS[p.status] ?? 'badge-gray'}`}>{p.status}</span>
                <span className="project-row-name">{p.name}</span>
                {p.category && <span className="badge badge-category">{p.category}</span>}
              </div>
              <div className="project-row-sub">
                {p.client_name && <span>{p.client_name}</span>}
                {p.assignee && <span>{p.assignee}</span>}
                {p.contract_amount != null && <span className="project-row-amount">¥{p.contract_amount.toLocaleString()}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, GanttChart } from 'lucide-react'
import type { Project, ProjectStatus, ProjectCategory } from '../types'
import { useOfficeFilter, matchesOffice } from '../lib/office'
import { useRefetchOnFocus } from '../lib/useRefetchOnFocus'

const STATUS_COLORS: Record<string, string> = {
  '着工前': 'badge-gray',
  '進行中': 'badge-blue',
  '確認待ち': 'badge-gray',
  '完了': 'badge-green',
  '請求待ち': 'badge-gray',
  '入金済み': 'badge-green',
}

const STATUSES: Array<ProjectStatus | 'すべて'> = ['すべて', '着工前', '進行中', '確認待ち', '完了', '請求待ち', '入金済み']
const CATEGORIES: ProjectCategory[] = ['管工事', '土木工事', '水道施設', '舗装', 'とび・土工']
const DIVISIONS = ['民間', '公共', '下請', '積水ハウス', '修繕']

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

// 現在の年度（ローカル日付・7月始まり）
function currentFiscalYear(): number {
  const d = new Date()
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return getFiscalYear(local) ?? d.getFullYear()
}

const COMPLETED_STATUSES = ['完了', '請求待ち', '入金済み']

// 工事が属する年度：
// - 完了/請求待ち/入金済み → 完了日(竣工日→契約日→登録日)の年度に固定（翌年度へ繰り越さない）
// - 未完了（着工前/進行中/確認待ち） → 現在の年度（6月末の年度切替で翌年度へ繰り越す）
function projectFiscalYear(p: Project): number | null {
  if (COMPLETED_STATUSES.includes(p.status)) {
    return getFiscalYear(p.end_date ?? p.contract_date ?? p.created_at)
  }
  return currentFiscalYear()
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'すべて'>('すべて')
  const [filterYear, setFilterYear] = useState<number | 'すべて'>(currentFiscalYear())
  const [filterCategory, setFilterCategory] = useState<ProjectCategory | null>(null)
  const [filterDivision, setFilterDivision] = useState<string | null>(null)
  const { loc } = useOfficeFilter()

  const yearInit = useRef(false)
  const load = () => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      const arr: Project[] = Array.isArray(data) ? data : []
      setProjects(arr)
      setLoading(false)
      // 初回のみ：現在の年度に工事が無ければ、直近の年度を初期表示にする
      if (!yearInit.current) {
        yearInit.current = true
        const cfy = currentFiscalYear()
        const fys = arr.map(p => projectFiscalYear(p)).filter((y): y is number => y !== null)
        if (!fys.includes(cfy) && fys.length > 0) setFilterYear(Math.max(...fys))
      }
    })
  }
  useEffect(() => { load() }, [])
  useRefetchOnFocus(load)

  // 存在する年度を降順で列挙（現在の年度は常に含める）
  const fiscalYears = Array.from(
    new Set([currentFiscalYear(), ...projects.map(p => projectFiscalYear(p))].filter((y): y is number => y !== null))
  ).sort((a, b) => b - a)

  const filtered = projects.filter(p => {
    const matchSearch = p.name.includes(search) || p.client_name.includes(search) || p.location.includes(search)
    const matchStatus = filterStatus === 'すべて' || p.status === filterStatus
    const matchYear = filterYear === 'すべて' || projectFiscalYear(p) === filterYear
    const matchCategory = !filterCategory || (p.category === filterCategory && p.status !== '入金済み')
    const matchDivision = !filterDivision || p.division === filterDivision
    return matchSearch && matchStatus && matchYear && matchCategory && matchDivision && matchesOffice(p.office, loc)
  })

  // 年度別の区分別 合計（決定済みの全工事・最終金額／拠点フィルタ反映／年度は projectFiscalYear）
  const summary: Record<number, { divs: Record<string, number>; none: number; total: number }> = {}
  projects
    .filter(p => matchesOffice(p.office, loc))
    .forEach(p => {
      const fy = projectFiscalYear(p)
      if (fy == null) return
      const amt = (p.contract_amount ?? 0) + (p.change_amount ?? 0)
      const y = summary[fy] ?? (summary[fy] = { divs: {}, none: 0, total: 0 })
      if (p.division && DIVISIONS.includes(p.division)) y.divs[p.division] = (y.divs[p.division] ?? 0) + amt
      else y.none += amt
      y.total += amt
    })
  // 完工高は「選択中の年度」だけ表示（「すべて」のときは出さない＝年度が増えても見やすく）
  const summaryYears = filterYear === 'すべて'
    ? []
    : Object.keys(summary).map(Number).filter(fy => fy === filterYear)

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

      {/* 工事区分タグ（民間/公共/下請/積水ハウス/修繕） */}
      <div className="filter-tabs">
        {DIVISIONS.map(d => (
          <button
            key={d}
            className={`filter-tab ${filterDivision === d ? 'active' : ''}`}
            onClick={() => setFilterDivision(filterDivision === d ? null : d)}
          >
            {d}
          </button>
        ))}
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

      {/* ステータスタブ（分類タグ選択中は無効化） */}
      {!filterCategory && (
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
      )}

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
                {p.division && <span className="badge badge-division">{p.division}</span>}
                {p.category && <span className="badge badge-category">{p.category}</span>}
              </div>
              <div className="project-row-sub">
                {p.client_name && <span>{p.client_name}</span>}
                {p.contract_date && <span className="project-row-date">契約 {p.contract_date.replace(/-/g, '/').slice(0, 10)}</span>}
                {p.assignee && <span>{p.assignee}</span>}
                {p.contract_amount != null && <span className="project-row-amount">¥{p.contract_amount.toLocaleString()}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {summaryYears.length > 0 && (
        <div className="proj-summary">
          <div className="proj-summary-title">
            年度別 完工高（区分別）
            <span className="proj-summary-note">7月〜6月・完了日基準</span>
          </div>
          {summaryYears.map(fy => (
            <div key={fy} className="proj-summary-year">
              <div className="proj-summary-year-head">{fy}年度（{fy}/7〜{fy + 1}/6）</div>
              {DIVISIONS.map(d => (
                <div key={d} className="proj-summary-row">
                  <span className="proj-summary-label">{d}</span>
                  <span className="proj-summary-amount">¥{(summary[fy].divs[d] ?? 0).toLocaleString()}</span>
                </div>
              ))}
              {summary[fy].none > 0 && (
                <div className="proj-summary-row">
                  <span className="proj-summary-label">区分なし</span>
                  <span className="proj-summary-amount">¥{summary[fy].none.toLocaleString()}</span>
                </div>
              )}
              <div className="proj-summary-row total">
                <span className="proj-summary-label">合計</span>
                <span className="proj-summary-amount">¥{summary[fy].total.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

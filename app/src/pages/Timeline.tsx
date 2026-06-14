import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Project, Process } from '../types'

const PROCESS_STATUS_COLORS: Record<string, string> = {
  '未着手': '#94a3b8',
  '準備中': '#f59e0b',
  '作業中': '#3b82f6',
  '確認待ち': '#f97316',
  '遅延':   '#ef4444',
  '完了':   '#10b981',
  '中止':   '#6b7280',
}

const PROJECT_STATUS_COLORS: Record<string, string> = {
  '着工前':  '#94a3b8',
  '進行中':  '#3b82f6',
  '確認待ち': '#f59e0b',
  '完了':    '#10b981',
  '請求':    '#8b5cf6',
  '入金済み': '#6b7280',
}

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }
function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export default function Timeline() {
  const navigate = useNavigate()
  const [projects, setProjects]   = useState<Project[]>([])
  const [processes, setProcesses] = useState<Process[]>([])
  const [loading, setLoading]     = useState(true)
  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1)
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()).catch(() => []),
      fetch('/api/processes').then(r => r.json()).catch(() => []),
    ]).then(([p, pr]) => {
      setProjects(Array.isArray(p) ? p : [])
      setProcesses(Array.isArray(pr) ? pr : [])
      setLoading(false)
    })
  }, [])

  const viewStart = startOfMonth(viewMonth)
  const viewEnd   = endOfMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
  const totalDays = daysBetween(viewStart, viewEnd) + 1

  const visibleProjects = projects.filter(p => {
    if (!p.start_date && !p.end_date) return false
    const s = p.start_date ? new Date(p.start_date) : null
    const e = p.end_date   ? new Date(p.end_date)   : null
    if (s && s > viewEnd)   return false
    if (e && e < viewStart) return false
    return true
  })

  const processByProject: Record<string, Process[]> = {}
  for (const proc of processes) {
    if (!proc.related_project_id) continue
    ;(processByProject[proc.related_project_id] ??= []).push(proc)
  }

  function getBar(start: string | null, end: string | null) {
    const s = start ? new Date(start) : viewStart
    const e = end   ? new Date(end)   : viewEnd
    const startDay = Math.max(0, daysBetween(viewStart, s))
    const endDay   = Math.min(totalDays, daysBetween(viewStart, e) + 1)
    return {
      left:  `${(startDay / totalDays) * 100}%`,
      width: `${Math.max((endDay - startDay) / totalDays * 100, 1.5)}%`,
    }
  }

  const today       = new Date()
  const todayOffset = daysBetween(viewStart, today)
  const todayLeft   = `${(todayOffset / totalDays) * 100}%`
  const todayVisible = todayOffset >= 0 && todayOffset <= totalDays

  // Build month header sections
  const months: Array<{ label: string; left: string; width: string }> = []
  let cursor = new Date(viewStart)
  while (cursor <= viewEnd) {
    const mStart  = startOfMonth(cursor)
    const mEnd    = endOfMonth(cursor)
    const startDay = Math.max(0, daysBetween(viewStart, mStart))
    const endDay   = Math.min(totalDays, daysBetween(viewStart, mEnd) + 1)
    months.push({
      label: `${cursor.getMonth() + 1}月`,
      left:  `${(startDay / totalDays) * 100}%`,
      width: `${((endDay - startDay) / totalDays) * 100}%`,
    })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }

  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
  const viewLabel = `${viewMonth.getFullYear()}年${viewMonth.getMonth() + 1}〜${viewMonth.getMonth() + 2}月`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header" style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', background: 'var(--white)' }}>
        <button className="btn-back" onClick={() => navigate('/projects')}><ArrowLeft size={20} /></button>
        <h1 className="page-title">工程タイムライン</h1>
      </div>

      {/* Month navigation */}
      <div className="gantt-nav">
        <button onClick={prevMonth}><ChevronLeft size={20} /></button>
        <span>{viewLabel}</span>
        <button onClick={nextMonth}><ChevronRight size={20} /></button>
      </div>

      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : (
        <div className="gantt-wrapper">
          {/* Month header row */}
          <div className="gantt-row gantt-header-row">
            <div className="gantt-label-col" />
            <div className="gantt-bars-col" style={{ minHeight: 28 }}>
              {months.map(m => (
                <div key={m.label} className="gantt-month-header" style={{ left: m.left, width: m.width }}>
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {visibleProjects.length === 0 ? (
            <p className="empty-text" style={{ padding: 24 }}>この期間の工事がありません</p>
          ) : visibleProjects.map(project => {
            const procs = processByProject[project.id] ?? []
            const color = PROJECT_STATUS_COLORS[project.status] ?? '#94a3b8'
            const bar   = getBar(project.start_date, project.end_date)

            return (
              <div key={project.id}>
                {/* Project row */}
                <Link to={`/projects/${project.id}`} className="gantt-row gantt-project-row">
                  <div className="gantt-label-col">
                    <span className="gantt-project-name">{project.name}</span>
                    {project.assignee && <span className="gantt-project-sub">{project.assignee}</span>}
                  </div>
                  <div className="gantt-bars-col">
                    {months.map((m, i) => <div key={i} className="gantt-grid-line" style={{ left: m.left }} />)}
                    {todayVisible && <div className="gantt-today-line" style={{ left: todayLeft }} />}
                    <div className="gantt-bar gantt-bar-project" style={{ left: bar.left, width: bar.width, background: color }}>
                      <span className="gantt-bar-label">{project.status}</span>
                    </div>
                  </div>
                </Link>

                {/* Process sub-rows */}
                {procs.map(proc => {
                  const procBar   = getBar(proc.planned_start, proc.planned_end)
                  const procColor = PROCESS_STATUS_COLORS[proc.status ?? ''] ?? '#94a3b8'
                  return (
                    <div key={proc.id} className="gantt-row gantt-process-row">
                      <div className="gantt-label-col gantt-process-label-col">
                        <span className="gantt-process-name">└ {proc.name}</span>
                      </div>
                      <div className="gantt-bars-col">
                        {months.map((m, i) => <div key={i} className="gantt-grid-line" style={{ left: m.left }} />)}
                        {todayVisible && <div className="gantt-today-line" style={{ left: todayLeft }} />}
                        <div className="gantt-bar gantt-bar-process" style={{ left: procBar.left, width: procBar.width, background: procColor }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="gantt-legend">
        <span style={{ fontSize: 11, color: 'var(--text-sub)', marginRight: 8 }}>工程:</span>
        {Object.entries(PROCESS_STATUS_COLORS).map(([s, c]) => (
          <span key={s} className="gantt-legend-item">
            <span style={{ background: c }} className="gantt-legend-dot" />{s}
          </span>
        ))}
      </div>
    </div>
  )
}

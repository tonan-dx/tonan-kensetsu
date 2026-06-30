import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Building2, ClipboardList, FileText, HardHat, Send, CheckSquare } from 'lucide-react'
import type { Project, DailyReport, Estimate, SafetyRecord, Task, Contact } from '../types'

function taskPath(t: Task): string | null {
  if (!t.ref_id) return null
  if (t.ref_type === 'project') return `/projects/${t.ref_id}`
  if (t.ref_type === 'estimate') return `/estimates/${t.ref_id}`
  if (t.ref_type === 'safety') return `/safety/${t.ref_id}`
  return null
}

export default function AssigneeView() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()

  const [projects, setProjects] = useState<Project[]>([])
  const [reports, setReports] = useState<DailyReport[]>([])
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [safety, setSafety] = useState<SafetyRecord[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()).catch(() => []),
      fetch('/api/reports').then(r => r.json()).catch(() => []),
      fetch('/api/estimates').then(r => r.json()).catch(() => []),
      fetch('/api/safety').then(r => r.json()).catch(() => []),
      fetch(`/api/checklist?assignee=${encodeURIComponent(name ?? '')}`).then(r => r.json()).catch(() => []),
      fetch('/api/contacts').then(r => r.json()).catch(() => []),
    ]).then(([p, r, e, s, t, c]) => {
      setProjects(Array.isArray(p) ? p.filter((x: Project) => x.assignee === name) : [])
      setReports(Array.isArray(r) ? r.filter((x: DailyReport) => x.assignee === name) : [])
      setEstimates(Array.isArray(e) ? e.filter((x: Estimate) => x.assignee === name && x.status !== 'ボツ／失注') : [])
      setSafety(Array.isArray(s) ? s.filter((x: SafetyRecord) => x.recorder === name) : [])
      setTasks(Array.isArray(t) ? t.filter((x: Task) => !x.done) : [])
      setContacts(Array.isArray(c) ? c.filter((x: Contact) => x.recipients.includes(name ?? '')) : [])
      setLoading(false)
    })
  }, [name])

  if (loading) return <div className="page"><div className="loading">読み込み中...</div></div>

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1 className="page-title">{name} の担当・連絡</h1>
      </div>

      {/* 連絡（報連相）— この人宛 */}
      <div className="assignee-section-block">
        <div className="assignee-section-head">
          <Send size={16} className="icon-indigo" />
          <span>連絡（{name} さん宛）</span>
          <span className="assignee-count">{contacts.length}件</span>
        </div>
        {contacts.length === 0 ? (
          <p className="assignee-empty">連絡なし</p>
        ) : (
          <div className="assignee-list">
            {contacts.map(c => (
              <Link to={`/contacts/${c.id}/edit`} key={c.id} className="assignee-item">
                <span className="assignee-item-name">{c.subject}</span>
                <span className={`assignee-item-sub${c.confirmed ? '' : ' unread'}`}>{c.confirmed ? '確認済' : '未確認'}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* タスク（未完了） */}
      <div className="assignee-section-block">
        <div className="assignee-section-head">
          <CheckSquare size={16} className="icon-blue" />
          <span>タスク（未完了）</span>
          <span className="assignee-count">{tasks.length}件</span>
        </div>
        {tasks.length === 0 ? (
          <p className="assignee-empty">タスクなし</p>
        ) : (
          <div className="assignee-list">
            {tasks.map(t => {
              const path = taskPath(t)
              const inner = (
                <>
                  <span className="assignee-item-name">{t.name}</span>
                  {t.due_date && <span className="assignee-item-sub">{t.due_date}</span>}
                </>
              )
              return path
                ? <Link to={path} key={t.id} className="assignee-item">{inner}</Link>
                : <div key={t.id} className="assignee-item">{inner}</div>
            })}
          </div>
        )}
      </div>

      {/* 工事 */}
      <div className="assignee-section-block">
        <div className="assignee-section-head">
          <Building2 size={16} className="icon-blue" />
          <span>工事管理</span>
          <span className="assignee-count">{projects.length}件</span>
        </div>
        {projects.length === 0 ? (
          <p className="assignee-empty">担当工事なし</p>
        ) : (
          <div className="assignee-list">
            {projects.map(p => (
              <Link to={`/projects/${p.id}`} key={p.id} className="assignee-item">
                <span className="assignee-item-name">{p.name}</span>
                <span className={`status-badge status-${p.status}`}>{p.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 見積 */}
      <div className="assignee-section-block">
        <div className="assignee-section-head">
          <FileText size={16} className="icon-purple" />
          <span>見積管理</span>
          <span className="assignee-count">{estimates.length}件</span>
        </div>
        {estimates.length === 0 ? (
          <p className="assignee-empty">担当見積なし</p>
        ) : (
          <div className="assignee-list">
            {estimates.map(e => (
              <Link to={`/estimates/${e.id}`} key={e.id} className="assignee-item">
                <span className="assignee-item-name">{e.title}</span>
                <span className="assignee-item-sub">{e.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 日報 */}
      <div className="assignee-section-block">
        <div className="assignee-section-head">
          <ClipboardList size={16} className="icon-green" />
          <span>日報</span>
          <span className="assignee-count">{reports.length}件</span>
        </div>
        {reports.length === 0 ? (
          <p className="assignee-empty">日報なし</p>
        ) : (
          <div className="assignee-list">
            {reports.slice(0, 10).map(r => (
              <Link to={`/reports/${r.id}`} key={r.id} className="assignee-item">
                <span className="assignee-item-name">{r.report_date ?? r.title}</span>
                <span className="assignee-item-sub">{r.project?.name ?? '工事未紐づけ'}</span>
              </Link>
            ))}
            {reports.length > 10 && (
              <p className="assignee-more">他 {reports.length - 10}件</p>
            )}
          </div>
        )}
      </div>

      {/* 安全 */}
      <div className="assignee-section-block">
        <div className="assignee-section-head">
          <HardHat size={16} className="icon-orange" />
          <span>安全管理</span>
          <span className="assignee-count">{safety.length}件</span>
        </div>
        {safety.length === 0 ? (
          <p className="assignee-empty">安全記録なし</p>
        ) : (
          <div className="assignee-list">
            {safety.slice(0, 5).map(s => (
              <Link to={`/safety/${s.id}`} key={s.id} className="assignee-item">
                <span className="assignee-item-name">{s.date ?? s.title}</span>
                <span className="assignee-item-sub">{s.project?.name ?? ''}</span>
              </Link>
            ))}
            {safety.length > 5 && (
              <p className="assignee-more">他 {safety.length - 5}件</p>
            )}
          </div>
        )}
      </div>

    </div>
  )
}

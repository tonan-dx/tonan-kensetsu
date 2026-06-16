import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Building2, ShieldAlert, ChevronRight } from 'lucide-react'
import type { Estimate, Project, SafetyRecord } from '../types'

export default function PresidentApproval() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [safety, setSafety] = useState<SafetyRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/estimates').then(r => r.json()).catch(() => []),
      fetch('/api/projects').then(r => r.json()).catch(() => []),
      fetch('/api/safety').then(r => r.json()).catch(() => []),
    ]).then(([e, p, s]) => {
      setEstimates(Array.isArray(e) ? e.filter((x: Estimate) => x.status === '社長チェック') : [])
      setProjects(Array.isArray(p) ? p.filter((x: Project) => x.status === '確認待ち') : [])
      setSafety(Array.isArray(s) ? s.filter((x: SafetyRecord) => !x.confirmed) : [])
      setLoading(false)
    })
  }, [])

  const total = estimates.length + projects.length + safety.length

  if (loading) return <div className="loading">読み込み中...</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">社長確認一覧</h1>
        {total > 0 && <span className="badge badge-red">{total}件</span>}
      </div>

      {total === 0 ? (
        <p className="empty-text">確認待ちの項目はありません</p>
      ) : (
        <>
          {estimates.length > 0 && (
            <section className="approval-section">
              <div className="approval-section-header">
                <FileText size={16} />
                <span>見積 — 社長チェック</span>
                <span className="approval-count">{estimates.length}件</span>
              </div>
              <div className="card-list">
                {estimates.map(e => (
                  <Link to={`/estimates/${e.id}`} key={e.id} className="card approval-card">
                    <div className="approval-card-main">
                      <span className="approval-card-title">{e.title}</span>
                      {e.customer_name && <span className="approval-card-sub">{e.customer_name}</span>}
                    </div>
                    <div className="approval-card-right">
                      {e.estimate_amount != null && (
                        <span className="approval-card-amount">¥{e.estimate_amount.toLocaleString()}</span>
                      )}
                      {e.assignee && <span className="approval-card-sub">{e.assignee}</span>}
                      <ChevronRight size={16} className="chevron" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {projects.length > 0 && (
            <section className="approval-section">
              <div className="approval-section-header">
                <Building2 size={16} />
                <span>工事 — 確認待ち</span>
                <span className="approval-count">{projects.length}件</span>
              </div>
              <div className="card-list">
                {projects.map(p => (
                  <Link to={`/projects/${p.id}`} key={p.id} className="card approval-card">
                    <div className="approval-card-main">
                      <span className="approval-card-title">{p.name}</span>
                      {p.client_name && <span className="approval-card-sub">{p.client_name}</span>}
                    </div>
                    <div className="approval-card-right">
                      {p.contract_amount != null && (
                        <span className="approval-card-amount">¥{p.contract_amount.toLocaleString()}</span>
                      )}
                      {p.assignee && <span className="approval-card-sub">{p.assignee}</span>}
                      <ChevronRight size={16} className="chevron" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {safety.length > 0 && (
            <section className="approval-section">
              <div className="approval-section-header">
                <ShieldAlert size={16} />
                <span>安全 — 未確認</span>
                <span className="approval-count">{safety.length}件</span>
              </div>
              <div className="card-list">
                {safety.map(s => (
                  <Link to={`/safety/${s.id}`} key={s.id} className="card approval-card">
                    <div className="approval-card-main">
                      <span className="approval-card-title">{s.title}</span>
                      {s.date && <span className="approval-card-sub">{s.date}</span>}
                    </div>
                    <div className="approval-card-right">
                      {s.project?.name && <span className="approval-card-sub">{s.project.name}</span>}
                      <ChevronRight size={16} className="chevron" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

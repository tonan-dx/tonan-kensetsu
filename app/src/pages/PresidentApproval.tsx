import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Building2, ShieldAlert, ChevronRight, ClipboardList, CheckCircle2 } from 'lucide-react'
import type { Estimate, Project, SafetyRecord, DailyReport } from '../types'

async function patchJson(url: string, body: object) {
  return fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

export default function PresidentApproval() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [safety, setSafety] = useState<SafetyRecord[]>([])
  const [reports, setReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/estimates').then(r => r.json()).catch(() => []),
      fetch('/api/projects').then(r => r.json()).catch(() => []),
      fetch('/api/safety').then(r => r.json()).catch(() => []),
      fetch('/api/reports').then(r => r.json()).catch(() => []),
    ]).then(([e, p, s, r]) => {
      setEstimates(Array.isArray(e) ? e.filter((x: Estimate) => x.status === '社長チェック') : [])
      setProjects(Array.isArray(p) ? p.filter((x: Project) => x.status === '確認待ち') : [])
      setSafety(Array.isArray(s) ? s.filter((x: SafetyRecord) => !x.confirmed) : [])
      setReports(Array.isArray(r) ? r.filter((x: DailyReport) => x.check_status === '確認中') : [])
      setLoading(false)
    })
  }, [])

  const confirmProject = async (id: string) => {
    setConfirming(id)
    await patchJson(`/api/projects/${id}`, { status: '進行中' })
    setProjects(prev => prev.filter(p => p.id !== id))
    setConfirming(null)
  }

  const confirmEstimate = async (id: string) => {
    setConfirming(id)
    await patchJson(`/api/estimates/${id}`, { status: 'お客様へ提出' })
    setEstimates(prev => prev.filter(e => e.id !== id))
    setConfirming(null)
  }

  const confirmSafety = async (id: string) => {
    setConfirming(id)
    await patchJson(`/api/safety/${id}`, { confirmed: true })
    setSafety(prev => prev.filter(s => s.id !== id))
    setConfirming(null)
  }

  const confirmReport = async (id: string) => {
    setConfirming(id)
    await patchJson(`/api/reports/${id}`, { check_status: '確認済み' })
    setReports(prev => prev.filter(r => r.id !== id))
    setConfirming(null)
  }

  const total = estimates.length + projects.length + safety.length + reports.length

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
                  <div key={e.id} className="card approval-card">
                    <Link to={`/estimates/${e.id}`} className="approval-card-link">
                      <div className="approval-card-main">
                        <span className="approval-card-title">{e.title}</span>
                        {e.customer_name && <span className="approval-card-sub">{e.customer_name}</span>}
                      </div>
                      <div className="approval-card-info">
                        {e.estimate_amount != null && <span className="approval-card-amount">¥{e.estimate_amount.toLocaleString()}</span>}
                        {e.assignee && <span className="approval-card-sub">{e.assignee}</span>}
                        <ChevronRight size={14} className="chevron" />
                      </div>
                    </Link>
                    <button
                      className="btn-confirm"
                      onClick={() => confirmEstimate(e.id)}
                      disabled={confirming === e.id}
                    >
                      <CheckCircle2 size={15} /> 確認済み
                    </button>
                  </div>
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
                  <div key={p.id} className="card approval-card">
                    <Link to={`/projects/${p.id}`} className="approval-card-link">
                      <div className="approval-card-main">
                        <span className="approval-card-title">{p.name}</span>
                        {p.client_name && <span className="approval-card-sub">{p.client_name}</span>}
                      </div>
                      <div className="approval-card-info">
                        {p.contract_amount != null && <span className="approval-card-amount">¥{p.contract_amount.toLocaleString()}</span>}
                        {p.assignee && <span className="approval-card-sub">{p.assignee}</span>}
                        <ChevronRight size={14} className="chevron" />
                      </div>
                    </Link>
                    <button
                      className="btn-confirm"
                      onClick={() => confirmProject(p.id)}
                      disabled={confirming === p.id}
                    >
                      <CheckCircle2 size={15} /> 確認済み
                    </button>
                  </div>
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
                  <div key={s.id} className="card approval-card">
                    <Link to={`/safety/${s.id}`} className="approval-card-link">
                      <div className="approval-card-main">
                        <span className="approval-card-title">{s.title}</span>
                        {s.date && <span className="approval-card-sub">{s.date}</span>}
                      </div>
                      <div className="approval-card-info">
                        {s.project?.name && <span className="approval-card-sub">{s.project.name}</span>}
                        <ChevronRight size={14} className="chevron" />
                      </div>
                    </Link>
                    <button
                      className="btn-confirm"
                      onClick={() => confirmSafety(s.id)}
                      disabled={confirming === s.id}
                    >
                      <CheckCircle2 size={15} /> 確認済み
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {reports.length > 0 && (
            <section className="approval-section">
              <div className="approval-section-header">
                <ClipboardList size={16} />
                <span>日報 — 社長確認中</span>
                <span className="approval-count">{reports.length}件</span>
              </div>
              <div className="card-list">
                {reports.map(r => (
                  <div key={r.id} className="card approval-card">
                    <Link to={`/reports/${r.id}`} className="approval-card-link">
                      <div className="approval-card-main">
                        <span className="approval-card-title">{r.title || r.report_date}</span>
                        {r.report_date && <span className="approval-card-sub">{r.report_date}</span>}
                      </div>
                      <div className="approval-card-info">
                        {r.assignee && <span className="approval-card-sub">{r.assignee}</span>}
                        <ChevronRight size={14} className="chevron" />
                      </div>
                    </Link>
                    <button
                      className="btn-confirm"
                      onClick={() => confirmReport(r.id)}
                      disabled={confirming === r.id}
                    >
                      <CheckCircle2 size={15} /> 確認済み
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

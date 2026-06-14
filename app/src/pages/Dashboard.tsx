import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ClipboardList, FileText, HardHat, ChevronRight, AlertTriangle, Bell, ShieldAlert } from 'lucide-react'
import type { Project, DailyReport, Estimate, SafetyRecord } from '../types'

const today = new Date().toISOString().slice(0, 10)
const todayJP = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [reports, setReports] = useState<DailyReport[]>([])
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [safetyRecords, setSafetyRecords] = useState<SafetyRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()).catch(() => []),
      fetch('/api/reports').then(r => r.json()).catch(() => []),
      fetch('/api/estimates').then(r => r.json()).catch(() => []),
      fetch('/api/safety').then(r => r.json()).catch(() => []),
    ]).then(([p, r, e, s]) => {
      setProjects(Array.isArray(p) ? p : [])
      setReports(Array.isArray(r) ? r : [])
      setEstimates(Array.isArray(e) ? e : [])
      setSafetyRecords(Array.isArray(s) ? s : [])
      setLoading(false)
    })
  }, [])

  const activeProjects = projects.filter(p => p.status === '進行中').length
  const pendingProjects = projects.filter(p => p.status === '確認待ち').length
  const troubleReports = reports.filter(r => r.trouble).length
  const todayReports = reports.filter(r => r.report_date === today).length
  const newEstimates = estimates.filter(e => e.status === '見積書作成前').length
  const activeEstimates = estimates.filter(e => e.status !== '着工決定' && e.status !== 'ボツ／失注').length
  const unconfirmedSafety = safetyRecords.filter(s => !s.confirmed).length
  const hazardSafety = safetyRecords.filter(s => s.near_miss || s.hazard).length

  if (loading) return <div className="loading">読み込み中...</div>

  return (
    <div className="page home-page">
      <div className="home-date">{todayJP}</div>

      <div className="home-tiles">

        <Link to="/projects" className="home-tile">
          <div className="home-tile-left">
            <div className="home-tile-icon blue">
              <Building2 size={26} />
            </div>
            <div>
              <div className="home-tile-title">工事管理</div>
              <div className="home-tile-stats">
                <span>進行中 <strong>{activeProjects}</strong>件</span>
                <span>全 {projects.length}件</span>
              </div>
              {pendingProjects > 0 && (
                <div className="home-tile-alert">
                  <AlertTriangle size={13} />
                  確認待ち {pendingProjects}件
                </div>
              )}
            </div>
          </div>
          <div className="home-tile-right">
            {pendingProjects > 0 && <span className="notif-badge">{pendingProjects}</span>}
            <ChevronRight size={20} className="home-tile-arrow" />
          </div>
        </Link>

        <Link to="/reports" className="home-tile">
          <div className="home-tile-left">
            <div className="home-tile-icon green">
              <ClipboardList size={26} />
            </div>
            <div>
              <div className="home-tile-title">日報</div>
              <div className="home-tile-stats">
                <span>今日 <strong>{todayReports}</strong>件</span>
                <span>全 {reports.length}件</span>
              </div>
              {troubleReports > 0 && (
                <div className="home-tile-alert red">
                  <AlertTriangle size={13} />
                  トラブル報告 {troubleReports}件
                </div>
              )}
            </div>
          </div>
          <div className="home-tile-right">
            {troubleReports > 0 && <span className="notif-badge red">{troubleReports}</span>}
            <ChevronRight size={20} className="home-tile-arrow" />
          </div>
        </Link>

        <Link to="/estimates" className="home-tile">
          <div className="home-tile-left">
            <div className="home-tile-icon purple">
              <FileText size={26} />
            </div>
            <div>
              <div className="home-tile-title">見積管理</div>
              <div className="home-tile-stats">
                <span>進行中 <strong>{activeEstimates}</strong>件</span>
              </div>
              {newEstimates > 0 && (
                <div className="home-tile-alert purple">
                  <Bell size={13} />
                  新規依頼 {newEstimates}件
                </div>
              )}
            </div>
          </div>
          <div className="home-tile-right">
            {newEstimates > 0 && <span className="notif-badge purple">{newEstimates}</span>}
            <ChevronRight size={20} className="home-tile-arrow" />
          </div>
        </Link>

        <Link to="/safety" className="home-tile">
          <div className="home-tile-left">
            <div className="home-tile-icon orange">
              <HardHat size={26} />
            </div>
            <div>
              <div className="home-tile-title">安全管理</div>
              <div className="home-tile-stats">
                <span>全 {safetyRecords.length}件</span>
              </div>
              {unconfirmedSafety > 0 && (
                <div className="home-tile-alert">
                  <ShieldAlert size={13} />
                  未確認 {unconfirmedSafety}件
                </div>
              )}
              {hazardSafety > 0 && (
                <div className="home-tile-alert red">
                  <AlertTriangle size={13} />
                  ヒヤリハット・危険箇所 {hazardSafety}件
                </div>
              )}
            </div>
          </div>
          <div className="home-tile-right">
            {unconfirmedSafety > 0 && <span className="notif-badge orange">{unconfirmedSafety}</span>}
            <ChevronRight size={20} className="home-tile-arrow" />
          </div>
        </Link>

      </div>
    </div>
  )
}

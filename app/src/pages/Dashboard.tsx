import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ClipboardList, FileText, HardHat, ChevronRight, AlertTriangle, Bell, ShieldAlert } from 'lucide-react'
import type { Project, DailyReport, Estimate, SafetyRecord, Notice, Assignee } from '../types'

const ASSIGNEES: Assignee[] = ['長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '佐野']

const today = new Date().toISOString().slice(0, 10)
const todayJP = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

function isRecent(dateStr: string | null, days = 7): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const threshold = new Date()
  threshold.setDate(threshold.getDate() - days)
  return d >= threshold
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [reports, setReports] = useState<DailyReport[]>([])
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [safetyRecords, setSafetyRecords] = useState<SafetyRecord[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()).catch(() => []),
      fetch('/api/reports').then(r => r.json()).catch(() => []),
      fetch('/api/estimates').then(r => r.json()).catch(() => []),
      fetch('/api/safety').then(r => r.json()).catch(() => []),
      fetch('/api/notices').then(r => r.json()).catch(() => []),
    ]).then(([p, r, e, s, n]) => {
      setProjects(Array.isArray(p) ? p : [])
      setReports(Array.isArray(r) ? r : [])
      setEstimates(Array.isArray(e) ? e : [])
      setSafetyRecords(Array.isArray(s) ? s : [])
      setNotices(Array.isArray(n) ? n : [])
      setLoading(false)
    })
  }, [])

  // 見積
  const newEstimates = estimates.filter(e => e.status === '見積書作成前').length
  const activeEstimates = estimates.filter(e => e.status !== '着工決定' && e.status !== 'ボツ／失注').length
  const presidentEstimates = estimates.filter(e => e.status === '社長チェック').length

  // 工事
  const activeProjects = projects.filter(p => p.status === '進行中').length
  const pendingProjects = projects.filter(p => p.status === '確認待ち').length

  // 日報
  const troubleReports = reports.filter(r => r.trouble).length
  const todayReports = reports.filter(r => r.report_date === today).length

  // 安全
  const unconfirmedSafety = safetyRecords.filter(s => !s.confirmed).length
  const hazardSafety = safetyRecords.filter(s => s.near_miss || s.hazard).length

  // お知らせ
  const recentNotices = notices.filter(n => isRecent(n.date ?? n.created_at)).length
  const todayNotices = notices.filter(n => (n.date ?? n.created_at?.slice(0, 10)) === today).length

  if (loading) return <div className="loading">読み込み中...</div>

  return (
    <div className="page home-page">
      <div className="home-date">{todayJP}</div>

      <div className="home-tiles">

        {/* 見積管理 */}
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
              {presidentEstimates > 0 && (
                <div className="home-tile-alert orange">
                  <AlertTriangle size={13} />
                  社長チェック待ち {presidentEstimates}件
                </div>
              )}
            </div>
          </div>
          <div className="home-tile-right">
            {(newEstimates + presidentEstimates) > 0 && <span className="notif-badge purple">{newEstimates + presidentEstimates}</span>}
            <ChevronRight size={20} className="home-tile-arrow" />
          </div>
        </Link>

        {/* 工事管理 */}
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

        {/* 日報 */}
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

        {/* 安全管理 */}
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

        {/* お知らせ */}
        <Link to="/notices" className="home-tile">
          <div className="home-tile-left">
            <div className="home-tile-icon teal">
              <Bell size={26} />
            </div>
            <div>
              <div className="home-tile-title">お知らせ</div>
              <div className="home-tile-stats">
                <span>全 {notices.length}件</span>
              </div>
              {todayNotices > 0 && (
                <div className="home-tile-alert teal">
                  <Bell size={13} />
                  本日 {todayNotices}件
                </div>
              )}
              {todayNotices === 0 && recentNotices > 0 && (
                <div className="home-tile-alert teal">
                  <Bell size={13} />
                  新着 {recentNotices}件（7日以内）
                </div>
              )}
            </div>
          </div>
          <div className="home-tile-right">
            {recentNotices > 0 && <span className="notif-badge teal">{recentNotices}</span>}
            <ChevronRight size={20} className="home-tile-arrow" />
          </div>
        </Link>

      </div>

      {/* 担当者ボタン */}
      <div className="assignee-bar">
        <div className="assignee-bar-label">担当者別</div>
        <div className="assignee-bar-buttons">
          {ASSIGNEES.map(a => (
            <Link to={`/assignee/${a}`} key={a} className="assignee-chip">{a}</Link>
          ))}
        </div>
      </div>

    </div>
  )
}

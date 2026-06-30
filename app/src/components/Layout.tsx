import { NavLink, Outlet } from 'react-router-dom'
import { Building2, ClipboardList, LayoutDashboard, FileText, HardHat, CheckSquare, Bell, Send } from 'lucide-react'
import { useOfficeFilter } from '../lib/office'
import type { OfficeFilter } from '../lib/office'

const LOC_OPTIONS: { key: OfficeFilter; label: string }[] = [
  { key: 'all', label: '全社' },
  { key: '本社', label: '本社' },
  { key: '釜石', label: '釜石' },
]

export default function Layout() {
  const { loc, setLoc } = useOfficeFilter()
  return (
    <div className="app-container">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <Building2 size={22} />
            <span>都南建設 工事管理</span>
          </div>
          <div className="loc-switch">
            {LOC_OPTIONS.map(o => (
              <button
                key={o.key}
                className={`loc-switch-btn${loc === o.key ? ' active' : ''}`}
                onClick={() => setLoc(o.key)}
              >{o.label}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <LayoutDashboard size={22} />
          <span>ホーム</span>
        </NavLink>
        <NavLink to="/estimates" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <FileText size={22} />
          <span>見積</span>
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Building2 size={22} />
          <span>工事</span>
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <ClipboardList size={22} />
          <span>日報</span>
        </NavLink>
        <NavLink to="/safety" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <HardHat size={22} />
          <span>安全</span>
        </NavLink>
        <NavLink to="/approval" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <CheckSquare size={22} />
          <span>確認</span>
        </NavLink>
        <NavLink to="/contacts" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Send size={22} />
          <span>連絡</span>
        </NavLink>
        <NavLink to="/notices" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Bell size={22} />
          <span>お知らせ</span>
        </NavLink>
      </nav>
    </div>
  )
}

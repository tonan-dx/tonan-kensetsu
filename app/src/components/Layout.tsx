import { NavLink, Outlet } from 'react-router-dom'
import { Building2, ClipboardList, LayoutDashboard } from 'lucide-react'

export default function Layout() {
  return (
    <div className="app-container">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <Building2 size={22} />
            <span>都南建設 工事管理</span>
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
        <NavLink to="/projects" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Building2 size={22} />
          <span>工事</span>
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <ClipboardList size={22} />
          <span>日報</span>
        </NavLink>
      </nav>
    </div>
  )
}

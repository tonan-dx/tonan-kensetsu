import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import ProjectForm from './pages/ProjectForm'
import Reports from './pages/Reports'
import ReportDetail from './pages/ReportDetail'
import ReportForm from './pages/ReportForm'
import Estimates from './pages/Estimates'
import EstimateDetail from './pages/EstimateDetail'
import EstimateForm from './pages/EstimateForm'
import Calendar from './pages/Calendar'
import Meeting from './pages/Meeting'
import MeetingDetail from './pages/MeetingDetail'
import Haichi from './pages/Haichi'
import Safety from './pages/Safety'
import SafetyDetail from './pages/SafetyDetail'
import SafetyForm from './pages/SafetyForm'
import PresidentApproval from './pages/PresidentApproval'
import Notices from './pages/Notices'
import NoticeDetail from './pages/NoticeDetail'
import NoticeForm from './pages/NoticeForm'
import AssigneeView from './pages/AssigneeView'
import Contacts from './pages/Contacts'
import ContactForm from './pages/ContactForm'
import ContactThread from './pages/ContactThread'
import { OfficeProvider } from './lib/office'

export default function App() {
  return (
    <OfficeProvider>
    <BrowserRouter>
      <Routes>
        {/* 配置表はPC用の独立全画面（モバイル枠・下メニューなし） */}
        <Route path="/haichi" element={<Haichi />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/new" element={<ProjectForm />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:id/edit" element={<ProjectForm />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/meeting" element={<Meeting />} />
          <Route path="/meeting/date/:date" element={<MeetingDetail />} />
          <Route path="/meeting/minutes/new" element={<NoticeForm kind="minutes" />} />
          <Route path="/meeting/minutes/:id" element={<NoticeDetail kind="minutes" />} />
          <Route path="/meeting/minutes/:id/edit" element={<NoticeForm kind="minutes" />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/safety/new" element={<SafetyForm />} />
          <Route path="/safety/:id" element={<SafetyDetail />} />
          <Route path="/safety/:id/edit" element={<SafetyForm />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/new" element={<ReportForm />} />
          <Route path="/reports/:id" element={<ReportDetail />} />
          <Route path="/reports/:id/edit" element={<ReportForm />} />
          <Route path="/estimates" element={<Estimates />} />
          <Route path="/estimates/new" element={<EstimateForm />} />
          <Route path="/estimates/:id" element={<EstimateDetail />} />
          <Route path="/estimates/:id/edit" element={<EstimateForm />} />
          <Route path="/approval" element={<PresidentApproval />} />
          <Route path="/notices" element={<Notices />} />
          <Route path="/notices/new" element={<NoticeForm />} />
          <Route path="/notices/:id" element={<NoticeDetail />} />
          <Route path="/notices/:id/edit" element={<NoticeForm />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contacts/new" element={<ContactForm />} />
          <Route path="/contacts/:id" element={<ContactThread />} />
          <Route path="/contacts/:id/edit" element={<ContactForm />} />
          <Route path="/assignee/:name" element={<AssigneeView />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </OfficeProvider>
  )
}

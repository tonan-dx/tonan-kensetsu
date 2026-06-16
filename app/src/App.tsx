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
import Timeline from './pages/Timeline'
import Safety from './pages/Safety'
import SafetyDetail from './pages/SafetyDetail'
import SafetyForm from './pages/SafetyForm'
import PresidentApproval from './pages/PresidentApproval'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/new" element={<ProjectForm />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:id/edit" element={<ProjectForm />} />
          <Route path="/timeline" element={<Timeline />} />
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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

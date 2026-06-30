import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { Project, Weather, Assignee } from '../types'
import { useOfficeFilter } from '../lib/office'

const WEATHERS: Weather[] = ['晴れ', 'くもり', '雨', '雪']
const ASSIGNEES: Assignee[] = ['長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '山崎', '幹子', '佐野', '上野', '岩洞', '小笠原']

export default function ReportForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = !!id && id !== 'new'
  const preselectedProject = searchParams.get('project_id') ?? ''
  const { loc } = useOfficeFilter()

  const [projects, setProjects] = useState<Project[]>([])
  const [form, setForm] = useState({
    title: '',
    office: loc === 'all' ? '' : loc,
    project_id: preselectedProject,
    report_date: new Date().toISOString().slice(0, 10),
    weather: '晴れ' as Weather,
    workers_count: '',
    work_content: '',
    tomorrow: '',
    notes: '',
    trouble: false,
    assignee: '' as Assignee | '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      setProjects(Array.isArray(data) ? data : [])
    })
    if (!isEdit) return
    fetch(`/api/reports/${id}`).then(r => r.json()).then(data => {
      setForm({
        title: data.title ?? '',
        office: data.office ?? '',
        project_id: data.project_id ?? '',
        report_date: data.report_date ?? new Date().toISOString().slice(0, 10),
        weather: data.weather ?? '晴れ',
        workers_count: data.workers_count?.toString() ?? '',
        work_content: data.work_content ?? '',
        tomorrow: data.tomorrow ?? '',
        notes: data.notes ?? '',
        trouble: data.trouble ?? false,
        assignee: data.assignee ?? '',
      })
    })
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const autoTitle = form.title || `${form.report_date} 日報`
    const payload = {
      title: autoTitle,
      office: form.office || null,
      project_id: form.project_id || undefined,
      report_date: form.report_date || undefined,
      weather: form.weather || undefined,
      workers_count: form.workers_count ? Number(form.workers_count) : undefined,
      work_content: form.work_content || undefined,
      tomorrow: form.tomorrow || undefined,
      notes: form.notes || undefined,
      trouble: form.trouble,
      assignee: form.assignee || undefined,
    }
    const url = isEdit ? `/api/reports/${id}` : '/api/reports'
    const method = isEdit ? 'PATCH' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    navigate(preselectedProject ? `/projects/${preselectedProject}` : '/reports')
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1 className="page-title">{isEdit ? '日報を編集' : '日報を追加'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label className="form-label">工事 *</label>
          <select className="form-select" required value={form.project_id}
            onChange={e => setForm({ ...form, project_id: e.target.value })}>
            <option value="">選択してください</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">拠点</label>
          <select className="form-select" value={form.office}
            onChange={e => setForm({ ...form, office: e.target.value })}>
            <option value="">未設定</option>
            <option value="本社">本社</option>
            <option value="釜石">釜石</option>
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">日付 *</label>
            <input type="date" className="form-input" required value={form.report_date}
              onChange={e => setForm({ ...form, report_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">天気</label>
            <select className="form-select" value={form.weather}
              onChange={e => setForm({ ...form, weather: e.target.value as Weather })}>
              {WEATHERS.map(w => <option key={w}>{w}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">担当者</label>
            <select className="form-select" value={form.assignee}
              onChange={e => setForm({ ...form, assignee: e.target.value as Assignee })}>
              <option value="">未選択</option>
              {ASSIGNEES.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">作業人数</label>
            <input type="number" className="form-input" placeholder="名" value={form.workers_count}
              onChange={e => setForm({ ...form, workers_count: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">今日やった作業 *</label>
          <textarea className="form-textarea" rows={4} required value={form.work_content}
            onChange={e => setForm({ ...form, work_content: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">明日やること</label>
          <textarea className="form-textarea" rows={2} value={form.tomorrow}
            onChange={e => setForm({ ...form, tomorrow: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">社長・担当者への確認事項</label>
          <textarea className="form-textarea" rows={2} value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="form-group form-checkbox-row">
          <input type="checkbox" id="trouble" checked={form.trouble}
            onChange={e => setForm({ ...form, trouble: e.target.checked })} />
          <label htmlFor="trouble" className="form-label">トラブルあり</label>
        </div>
        <button type="submit" className="btn-submit" disabled={saving}>
          {saving ? '保存中...' : '保存する'}
        </button>
      </form>
    </div>
  )
}

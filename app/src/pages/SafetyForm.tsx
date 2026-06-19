import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { Project } from '../types'

export default function SafetyForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEdit = !!id && id !== 'new'

  const [projects, setProjects] = useState<Project[]>([])
  const [form, setForm] = useState({
    title: '',
    date: '',
    project_id: searchParams.get('project_id') ?? '',
    ky_activity: '',
    near_miss: '',
    safety_log: '',
    hazard: '',
    corrective_action: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(data => setProjects(Array.isArray(data) ? data : [])).catch(() => {})
    if (!isEdit) return
    fetch(`/api/safety/${id}`).then(r => r.json()).then(data => {
      setForm({
        title: data.title ?? '',
        date: data.date ?? '',
        project_id: data.project_id ?? '',
        ky_activity: data.ky_activity ?? '',
        near_miss: data.near_miss ?? '',
        safety_log: data.safety_log ?? '',
        hazard: data.hazard ?? '',
        corrective_action: data.corrective_action ?? '',
      })
    }).catch(() => {})
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      title: form.title,
      date: form.date || undefined,
      project_id: form.project_id || undefined,
      ky_activity: form.ky_activity || undefined,
      near_miss: form.near_miss || undefined,
      safety_log: form.safety_log || undefined,
      hazard: form.hazard || undefined,
      corrective_action: form.corrective_action || undefined,
    }
    const url = isEdit ? `/api/safety/${id}` : '/api/safety'
    const method = isEdit ? 'PATCH' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    navigate('/safety')
  }

  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1 className="page-title">{isEdit ? '安全記録を編集' : '新規安全記録'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label className="form-label">タイトル *</label>
          <input className="form-input" required value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">日付</label>
            <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">関連工事</label>
            <select className="form-select" value={form.project_id} onChange={e => set('project_id', e.target.value)}>
              <option value="">未選択</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">KY活動記録</label>
          <textarea className="form-textarea" rows={3} value={form.ky_activity} onChange={e => set('ky_activity', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">安全日誌</label>
          <textarea className="form-textarea" rows={3} value={form.safety_log} onChange={e => set('safety_log', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">ヒヤリハット</label>
          <textarea className="form-textarea" rows={3} value={form.near_miss} onChange={e => set('near_miss', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">危険箇所</label>
          <textarea className="form-textarea" rows={2} value={form.hazard} onChange={e => set('hazard', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">是正対応</label>
          <textarea className="form-textarea" rows={2} value={form.corrective_action} onChange={e => set('corrective_action', e.target.value)} />
        </div>
        <button type="submit" className="btn-submit" disabled={saving}>
          {saving ? '保存中...' : '保存する'}
        </button>
      </form>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { ProjectStatus, WorkType, Assignee } from '../types'

const STATUSES: ProjectStatus[] = ['着工前', '進行中', '確認待ち', '完了', '請求', '入金済み']
const TYPES: WorkType[] = ['新築', 'リフォーム・改修', '修繕', '解体', '土木・外構', 'その他']
const ASSIGNEES: Assignee[] = ['長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '山崎', '佐野', '上野', '岩洞', '小笠原']

export default function ProjectForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id && id !== 'new'

  const [form, setForm] = useState({
    name: '',
    client_name: '',
    location: '',
    status: '着工前' as ProjectStatus,
    type: '' as WorkType | '',
    assignee: '' as Assignee | '',
    start_date: '',
    end_date: '',
    contract_amount: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    fetch(`/api/projects/${id}`).then(r => r.json()).then(data => {
      setForm({
        name: data.name ?? '',
        client_name: data.client_name ?? '',
        location: data.location ?? '',
        status: data.status ?? '着工前',
        type: data.type ?? '',
        assignee: data.assignee ?? '',
        start_date: data.start_date ?? '',
        end_date: data.end_date ?? '',
        contract_amount: data.contract_amount?.toString() ?? '',
      })
    })
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name,
      client_name: form.client_name || undefined,
      location: form.location || undefined,
      status: form.status,
      type: form.type || undefined,
      assignee: form.assignee || undefined,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      contract_amount: form.contract_amount ? Number(form.contract_amount) : undefined,
    }
    const url = isEdit ? `/api/projects/${id}` : '/api/projects'
    const method = isEdit ? 'PATCH' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    navigate('/projects')
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1 className="page-title">{isEdit ? '工事を編集' : '新規工事'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label className="form-label">工事名 *</label>
          <input className="form-input" required value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">お客様名</label>
          <input className="form-input" value={form.client_name}
            onChange={e => setForm({ ...form, client_name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">現場住所</label>
          <input className="form-input" value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">ステータス</label>
            <select className="form-select" value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value as ProjectStatus })}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">工事種別</label>
            <select className="form-select" value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value as WorkType })}>
              <option value="">未選択</option>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">担当者</label>
          <select className="form-select" value={form.assignee}
            onChange={e => setForm({ ...form, assignee: e.target.value as Assignee })}>
            <option value="">未選択</option>
            {ASSIGNEES.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">着工日</label>
            <input type="date" className="form-input" value={form.start_date}
              onChange={e => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">竣工日</label>
            <input type="date" className="form-input" value={form.end_date}
              onChange={e => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">契約金額（円）</label>
          <input type="number" className="form-input" value={form.contract_amount}
            onChange={e => setForm({ ...form, contract_amount: e.target.value })} />
        </div>
        <button type="submit" className="btn-submit" disabled={saving}>
          {saving ? '保存中...' : '保存する'}
        </button>
      </form>
    </div>
  )
}

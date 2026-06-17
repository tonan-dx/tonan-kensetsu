import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { Assignee } from '../types'

const ASSIGNEES: Array<Assignee | '管理者'> = ['管理者', '長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '佐野']

export default function NoticeForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [form, setForm] = useState({
    title: '',
    content: '',
    date: new Date().toISOString().slice(0, 10),
    poster: '' as string,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit) return
    fetch(`/api/notices/${id}`).then(r => r.json()).then(data => {
      setForm({
        title: data.title ?? '',
        content: data.content ?? '',
        date: data.date ?? new Date().toISOString().slice(0, 10),
        poster: data.poster ?? '',
      })
    })
  }, [id, isEdit])

  const set = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    setError(null)
    const body = {
      title: form.title,
      content: form.content || null,
      date: form.date || null,
      poster: form.poster || null,
    }
    try {
      if (isEdit) {
        const res = await fetch(`/api/notices/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || `HTTP ${res.status}`) }
        navigate(`/notices/${id}`)
      } else {
        const res = await fetch('/api/notices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || `HTTP ${res.status}`) }
        const created = await res.json()
        navigate(`/notices/${created.id}`)
      }
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1 className="page-title">{isEdit ? 'お知らせ編集' : '新規お知らせ'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label className="form-label">タイトル <span className="form-required">*</span></label>
          <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} required />
        </div>

        <div className="form-group">
          <label className="form-label">内容</label>
          <textarea className="form-textarea" rows={6} value={form.content} onChange={e => set('content', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">日付</label>
          <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">投稿者</label>
          <select className="form-select" value={form.poster} onChange={e => set('poster', e.target.value)}>
            <option value="">選択してください</option>
            {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {error && <div className="form-error">{error}</div>}

        <button type="submit" className="btn-primary btn-full" disabled={saving}>
          {saving ? '保存中...' : (isEdit ? '更新する' : '投稿する')}
        </button>
      </form>
    </div>
  )
}

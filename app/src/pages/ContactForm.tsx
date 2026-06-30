import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useOfficeFilter } from '../lib/office'

const MEMBERS = ['長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '山崎', '幹子', '佐野', '上野', '岩洞', '小笠原']

export default function ContactForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { loc } = useOfficeFilter()

  const [form, setForm] = useState({
    subject: '',
    content: '',
    poster: '',
    date: new Date().toISOString().slice(0, 10),
    office: loc === 'all' ? '' : loc,
  })
  const [recipients, setRecipients] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit) return
    fetch(`/api/contacts/${id}`).then(r => r.json()).then(data => {
      setForm({
        subject: data.subject ?? '',
        content: data.content ?? '',
        poster: data.poster ?? '',
        date: data.date ?? new Date().toISOString().slice(0, 10),
        office: data.office ?? '',
      })
      setRecipients(Array.isArray(data.recipients) ? data.recipients : [])
    })
  }, [id, isEdit])

  const set = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }))
  const toggleRecipient = (m: string) =>
    setRecipients(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.subject.trim()) return
    setSaving(true)
    setError(null)
    const body = {
      subject: form.subject,
      recipients,
      content: form.content || null,
      poster: form.poster || null,
      date: form.date || null,
      office: form.office || null,
    }
    try {
      const url = isEdit ? `/api/contacts/${id}` : '/api/contacts'
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const er = await res.json(); throw new Error(er.error || `HTTP ${res.status}`) }
      navigate('/contacts')
    } catch (er) {
      setError(String(er))
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1 className="page-title">{isEdit ? '連絡を編集' : '新しい連絡'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label className="form-label">伝えたい人（宛先）</label>
          <div className="recipient-chips">
            {MEMBERS.map(m => (
              <button
                type="button"
                key={m}
                className={`recipient-chip${recipients.includes(m) ? ' selected' : ''}`}
                onClick={() => toggleRecipient(m)}
              >{m}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">件名 <span className="form-required">*</span></label>
          <input className="form-input" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="例：◯◯さんから電話あり" required />
        </div>

        <div className="form-group">
          <label className="form-label">内容</label>
          <textarea className="form-textarea" rows={5} value={form.content} onChange={e => set('content', e.target.value)} placeholder="伝えたい内容を入力..." />
        </div>

        <div className="form-group">
          <label className="form-label">拠点</label>
          <select className="form-select" value={form.office} onChange={e => set('office', e.target.value)}>
            <option value="">未設定</option>
            <option value="本社">本社</option>
            <option value="釜石">釜石</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">投稿者</label>
          <select className="form-select" value={form.poster} onChange={e => set('poster', e.target.value)}>
            <option value="">選択してください</option>
            {MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">日付</label>
          <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>

        {error && <div className="form-error">{error}</div>}

        <button type="submit" className="btn-primary btn-full" disabled={saving}>
          {saving ? '保存中...' : (isEdit ? '更新する' : '連絡する')}
        </button>
      </form>
    </div>
  )
}

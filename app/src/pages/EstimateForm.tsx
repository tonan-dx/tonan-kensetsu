import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { Assignee, EstimateStatus } from '../types'

const ASSIGNEES: Assignee[] = ['長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '佐野']
const STATUSES: EstimateStatus[] = ['見積書作成前', '見積書作成中', '社長チェック', 'お客様へ提出', '着工決定', 'ボツ／失注']

export default function EstimateForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [form, setForm] = useState({
    title: '',
    customer_name: '',
    address: '',
    assignee: '' as Assignee | '',
    estimate_deadline: '',
    estimate_amount: '',
    cost_estimate: '',
    gross_profit: '',
    status: '見積書作成前' as EstimateStatus,
    request_content: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    fetch(`/api/estimates/${id}`)
      .then(r => r.json())
      .then(data => setForm({
        title: data.title ?? '',
        customer_name: data.customer_name ?? '',
        address: data.address ?? '',
        assignee: data.assignee ?? '',
        estimate_deadline: data.estimate_deadline ?? '',
        estimate_amount: data.estimate_amount != null ? String(data.estimate_amount) : '',
        cost_estimate: data.cost_estimate != null ? String(data.cost_estimate) : '',
        gross_profit: data.gross_profit != null ? String(data.gross_profit) : '',
        status: data.status ?? '見積書作成前',
        request_content: data.request_content ?? '',
        notes: data.notes ?? '',
      }))
  }, [id, isEdit])

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const body = {
      title: form.title,
      customer_name: form.customer_name || null,
      address: form.address || null,
      assignee: form.assignee || null,
      estimate_deadline: form.estimate_deadline || null,
      estimate_amount: form.estimate_amount ? Number(form.estimate_amount) : null,
      cost_estimate: form.cost_estimate ? Number(form.cost_estimate) : null,
      gross_profit: form.gross_profit ? Number(form.gross_profit) : null,
      status: form.status,
      request_content: form.request_content || null,
      notes: form.notes || null,
    }
    const url = isEdit ? `/api/estimates/${id}` : '/api/estimates'
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    navigate(`/estimates/${data.id}`)
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1 className="page-title">{isEdit ? '見積編集' : '見積新規登録'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label className="form-label">案件名 *</label>
          <input className="form-input" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="例：田中様邸 外壁塗装工事" />
        </div>

        <div className="form-group">
          <label className="form-label">お客様名</label>
          <input className="form-input" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="例：田中 太郎" />
        </div>

        <div className="form-group">
          <label className="form-label">現場住所</label>
          <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="例：盛岡市○○1-1-1" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">担当者</label>
            <select className="form-select" value={form.assignee} onChange={e => set('assignee', e.target.value)}>
              <option value="">選択</option>
              {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">ステータス</label>
            <select className="form-select" value={form.status} onChange={e => set('status', e.target.value as EstimateStatus)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">見積期限</label>
          <input type="date" className="form-input" value={form.estimate_deadline} onChange={e => set('estimate_deadline', e.target.value)} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">見積金額（円）</label>
            <input type="number" className="form-input" value={form.estimate_amount} onChange={e => set('estimate_amount', e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">原価予定（円）</label>
            <input type="number" className="form-input" value={form.cost_estimate} onChange={e => set('cost_estimate', e.target.value)} placeholder="0" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">粗利予定（円）</label>
          <input type="number" className="form-input" value={form.gross_profit} onChange={e => set('gross_profit', e.target.value)} placeholder="0" />
        </div>

        <div className="form-group">
          <label className="form-label">依頼内容</label>
          <textarea className="form-textarea" rows={3} value={form.request_content} onChange={e => set('request_content', e.target.value)} placeholder="お客様からの依頼内容" />
        </div>

        <div className="form-group">
          <label className="form-label">メモ</label>
          <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="社内メモ" />
        </div>

        <button type="submit" className="btn-submit" disabled={saving}>
          {saving ? '保存中...' : isEdit ? '更新する' : '登録する'}
        </button>
      </form>
    </div>
  )
}

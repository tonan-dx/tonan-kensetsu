import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { ProjectStatus, ProjectCategory, Assignee } from '../types'

const STATUSES: ProjectStatus[] = ['着工前', '進行中', '確認待ち', '完了', '請求', '入金済み']
const CATEGORIES: ProjectCategory[] = ['管工事', '土木工事', '水道施設', '舗装', 'とび・土工']
const ASSIGNEES: Assignee[] = ['長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '山崎', '幹子', '佐野', '上野', '岩洞', '小笠原']

export default function ProjectForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id && id !== 'new'

  const [form, setForm] = useState({
    assignee: '' as Assignee | '',
    contract_date: '',
    category: '' as ProjectCategory | '',
    status: '着工前' as ProjectStatus,
    start_date: '',
    end_date: '',
    client_name: '',
    name: '',
    location: '',
    contact: '',
    contract_amount: '',
    change_amount: '',
    billing_date: '',
    payment_date: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!isEdit) return
    fetch(`/api/projects/${id}`).then(r => r.json()).then(d => {
      setForm({
        assignee: d.assignee ?? '',
        contract_date: d.contract_date ?? '',
        category: d.category ?? '',
        status: d.status ?? '着工前',
        start_date: d.start_date ?? '',
        end_date: d.end_date ?? '',
        client_name: d.client_name ?? '',
        name: d.name ?? '',
        location: d.location ?? '',
        contact: d.contact ?? '',
        contract_amount: d.contract_amount?.toString() ?? '',
        change_amount: d.change_amount?.toString() ?? '',
        billing_date: d.billing_date ?? '',
        payment_date: d.payment_date ?? '',
        notes: d.notes ?? '',
      })
    })
  }, [id, isEdit])

  const contractAmt = Number(form.contract_amount) || 0
  const changeAmt = Number(form.change_amount) || 0
  const totalAmt = contractAmt + changeAmt

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload: any = {
      name: form.name,
      client_name: form.client_name || undefined,
      location: form.location || undefined,
      status: form.status,
      category: form.category || undefined,
      assignee: form.assignee || undefined,
      contract_date: form.contract_date || undefined,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      contact: form.contact || undefined,
      contract_amount: form.contract_amount ? Number(form.contract_amount) : undefined,
      change_amount: form.change_amount !== '' ? Number(form.change_amount) : undefined,
      billing_date: form.billing_date || undefined,
      payment_date: form.payment_date || undefined,
      notes: form.notes || undefined,
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

        {/* 担当者 */}
        <div className="form-group">
          <label className="form-label">担当者</label>
          <select className="form-select" value={form.assignee} onChange={e => set('assignee', e.target.value)}>
            <option value="">未選択</option>
            {ASSIGNEES.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>

        {/* 契約日 */}
        <div className="form-group">
          <label className="form-label">契約日（見積決定日）</label>
          <input type="date" className="form-input" value={form.contract_date}
            onChange={e => set('contract_date', e.target.value)} />
        </div>

        {/* 分類 */}
        <div className="form-group">
          <label className="form-label">工事分類</label>
          <select className="form-select" value={form.category} onChange={e => set('category', e.target.value as ProjectCategory)}>
            <option value="">未選択</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* ステータス */}
        <div className="form-group">
          <label className="form-label">ステータス</label>
          <select className="form-select" value={form.status} onChange={e => set('status', e.target.value as ProjectStatus)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* 工期 */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">着工日</label>
            <input type="date" className="form-input" value={form.start_date}
              onChange={e => set('start_date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">竣工日</label>
            <input type="date" className="form-input" value={form.end_date}
              onChange={e => set('end_date', e.target.value)} />
          </div>
        </div>

        {/* 発注者 */}
        <div className="form-group">
          <label className="form-label">発注者</label>
          <input className="form-input" value={form.client_name}
            onChange={e => set('client_name', e.target.value)} placeholder="例：盛岡市" />
        </div>

        {/* 工事名 */}
        <div className="form-group">
          <label className="form-label">工事名 *</label>
          <input className="form-input" required value={form.name}
            onChange={e => set('name', e.target.value)} placeholder="例：○○地区配水管布設工事" />
        </div>

        {/* 工事場所 */}
        <div className="form-group">
          <label className="form-label">工事場所</label>
          <input className="form-input" value={form.location}
            onChange={e => set('location', e.target.value)} placeholder="例：盛岡市○○1-1-1" />
        </div>

        {/* 連絡先 */}
        <div className="form-group">
          <label className="form-label">連絡先</label>
          <input type="tel" className="form-input" value={form.contact}
            onChange={e => set('contact', e.target.value)} placeholder="例：019-XXX-XXXX" />
        </div>

        {/* 金額 */}
        <div className="form-group">
          <label className="form-label">請負金額（円）</label>
          <input type="number" className="form-input" value={form.contract_amount}
            onChange={e => set('contract_amount', e.target.value)} placeholder="0" />
        </div>

        <div className="form-group">
          <label className="form-label">増減金額（円）</label>
          <input type="number" className="form-input" value={form.change_amount}
            onChange={e => set('change_amount', e.target.value)} placeholder="0（マイナスも可）" />
        </div>

        <div className="form-group">
          <label className="form-label">合計金額（自動計算）</label>
          <div className="form-calculated">
            ¥{totalAmt.toLocaleString()}
          </div>
        </div>

        {/* 請求日 */}
        <div className="form-group">
          <label className="form-label">請求日</label>
          <input type="date" className="form-input" value={form.billing_date}
            onChange={e => set('billing_date', e.target.value)} />
        </div>

        {/* 入金日 */}
        <div className="form-group">
          <label className="form-label">入金日</label>
          <input type="date" className="form-input" value={form.payment_date}
            onChange={e => set('payment_date', e.target.value)} />
        </div>

        {/* 備考 */}
        <div className="form-group">
          <label className="form-label">備考</label>
          <textarea className="form-textarea" rows={3} value={form.notes}
            onChange={e => set('notes', e.target.value)} placeholder="備考・メモ" />
        </div>

        <button type="submit" className="btn-submit" disabled={saving}>
          {saving ? '保存中...' : '保存する'}
        </button>
      </form>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { ProjectStatus, ProjectCategory, Assignee } from '../types'
import { useOfficeFilter } from '../lib/office'

const STATUSES: ProjectStatus[] = ['着工前', '進行中', '確認待ち', '完了', '請求待ち', '入金済み']
const CATEGORIES: ProjectCategory[] = ['管工事', '土木工事', '水道施設', '舗装', 'とび・土工']
const DIVISIONS = ['民間', '公共', '下請', '積水ハウス', '修繕']
const ASSIGNEES: Assignee[] = ['長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '山崎', '幹子', '佐野', '上野', '岩洞', '小笠原']

/** タップで選ぶチップ式セレクタ。activeを再タップで解除（allowClear時）。 */
function ChipGroup({ options, value, onSelect, allowClear = true }: {
  options: readonly string[]
  value: string
  onSelect: (v: string) => void
  allowClear?: boolean
}) {
  return (
    <div className="chip-group">
      {options.map(o => (
        <button
          type="button"
          key={o}
          className={`chip-opt${value === o ? ' active' : ''}`}
          onClick={() => onSelect(value === o && allowClear ? '' : o)}
        >{o}</button>
      ))}
    </div>
  )
}

export default function ProjectForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id && id !== 'new'
  const { loc } = useOfficeFilter()

  const [form, setForm] = useState({
    assignee: '' as Assignee | '',
    office: loc === 'all' ? '' : loc,
    contract_date: '',
    category: '' as ProjectCategory | '',
    division: '',
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
    progress: '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!isEdit) return
    fetch(`/api/projects/${id}`).then(r => r.json()).then(d => {
      setForm({
        assignee: d.assignee ?? '',
        office: d.office ?? '',
        contract_date: d.contract_date ?? '',
        category: d.category ?? '',
        division: d.division ?? '',
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
        progress: d.progress != null ? String(d.progress) : '',
      })
    })
  }, [id, isEdit])

  const contractAmt = Number(form.contract_amount) || 0
  const changeAmt = Number(form.change_amount) || 0
  const totalAmt = contractAmt + changeAmt

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    // 「完了」を選んだら自動的に「請求待ち」へ進める（完了＝請求待ちにたまる運用）
    const statusToSave = form.status === '完了' ? '請求待ち' : form.status
    const payload: Record<string, unknown> = {
      name: form.name,
      office: form.office || null,
      client_name: form.client_name || undefined,
      location: form.location || undefined,
      status: statusToSave,
      category: form.category || undefined,
      division: form.division || undefined,
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
      // 進行率：未入力は null（クリア）、入力ありは 0〜100 の数値
      progress: form.progress !== '' ? Number(form.progress) : null,
    }
    const url = isEdit ? `/api/projects/${id}` : '/api/projects'
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) {
      alert('保存に失敗しました。入力内容をご確認ください。')
      setSaving(false)
      return
    }
    setSaving(false)
    navigate('/projects')
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1 className="page-title">{isEdit ? '工事を編集' : '新規工事'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="form"
        onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') e.preventDefault() }}>

        {/* 拠点 */}
        <div className="form-group">
          <label className="form-label">拠点</label>
          <ChipGroup options={['本社', '釜石']} value={form.office} onSelect={v => set('office', v)} />
        </div>

        {/* 担当者 */}
        <div className="form-group">
          <label className="form-label">担当者</label>
          <ChipGroup options={ASSIGNEES} value={form.assignee} onSelect={v => set('assignee', v)} />
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
          <ChipGroup options={CATEGORIES} value={form.category} onSelect={v => set('category', v)} />
        </div>

        {/* 工事区分（民間/公共/下請/積水ハウス/修繕） */}
        <div className="form-group">
          <label className="form-label">工事区分</label>
          <ChipGroup options={DIVISIONS} value={form.division} onSelect={v => set('division', v)} />
        </div>

        {/* ステータス（「完了」を押すと自動で「請求待ち」へ） */}
        <div className="form-group">
          <label className="form-label">ステータス</label>
          <ChipGroup
            options={STATUSES}
            value={form.status}
            allowClear={false}
            onSelect={v => set('status', v === '完了' ? '請求待ち' : v)}
          />
          <p className="form-hint">
            「完了」を押すと自動で「請求待ち」になります。請求日を入れると一覧で「請求済」表示、入金日を入れると「入金済み」になります。
          </p>
        </div>

        {/* 進行率（工事の進み具合・0〜100%） */}
        <div className="form-group">
          <label className="form-label">
            進行率
            <span className="progress-value">{form.progress !== '' ? `${form.progress}%` : '未入力'}</span>
          </label>
          <input
            type="range"
            className="progress-range"
            min={0}
            max={100}
            step={5}
            value={form.progress === '' ? 0 : Number(form.progress)}
            onChange={e => set('progress', e.target.value)}
          />
          {form.progress !== '' && (
            <button type="button" className="progress-clear" onClick={() => set('progress', '')}>
              進行率をクリア
            </button>
          )}
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

        {/* 入金日（入力すると自動で「入金済み」へ） */}
        <div className="form-group">
          <label className="form-label">入金日</label>
          <input type="date" className="form-input" value={form.payment_date}
            onChange={e => {
              const v = e.target.value
              setForm(f => ({ ...f, payment_date: v, status: v ? '入金済み' : f.status }))
            }} />
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

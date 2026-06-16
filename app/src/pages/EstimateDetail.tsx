import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, ChevronRight, Send } from 'lucide-react'
import type { Estimate, EstimateStatus } from '../types'
import TaskList from '../components/TaskList'

const STATUS_COLOR: Record<string, string> = {
  '見積書作成前': '#9ca3af',
  '見積書作成中': '#3b82f6',
  '社長チェック':  '#f59e0b',
  'お客様へ提出':  '#8b5cf6',
  '着工決定':      '#10b981',
  'ボツ／失注':    '#ef4444',
}

const NEXT_STATUS: Partial<Record<EstimateStatus, EstimateStatus>> = {
  '見積書作成前': '見積書作成中',
  '見積書作成中': '社長チェック',
  '社長チェック':  'お客様へ提出',
  'お客様へ提出':  '着工決定',
}

export default function EstimateDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetch(`/api/estimates/${id}`)
      .then(r => r.json())
      .then(data => { setEstimate(data); setLoading(false) })
  }, [id])

  const advanceStatus = async (newStatus: EstimateStatus) => {
    if (!estimate) return
    setUpdating(true)
    const body: any = { status: newStatus }
    if (newStatus === '着工決定') body.decision_date = new Date().toISOString().slice(0, 10)
    const res = await fetch(`/api/estimates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const updated = await res.json()
    setEstimate(updated)
    setUpdating(false)
  }

  const markBotsu = async () => {
    if (!confirm('ボツ／失注にしますか？')) return
    setUpdating(true)
    const reason = prompt('ボツ理由（任意）') ?? ''
    await fetch(`/api/estimates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ボツ／失注', rejection_reason: reason }),
    })
    navigate('/estimates')
  }

  const handleDelete = async () => {
    if (!confirm('この見積案件を削除しますか？')) return
    await fetch(`/api/estimates/${id}`, { method: 'DELETE' })
    navigate('/estimates')
  }

  if (loading) return <div className="page"><div className="loading">読み込み中...</div></div>
  if (!estimate) return <div className="page"><p>見つかりません</p></div>

  const nextStatus = NEXT_STATUS[estimate.status as EstimateStatus]

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1 className="page-title" style={{ flex: 1 }}>{estimate.title}</h1>
        <Link to={`/estimates/${id}/edit`} className="btn-icon"><Pencil size={18} /></Link>
        <button className="btn-icon danger" onClick={handleDelete}><Trash2 size={18} /></button>
      </div>

      {estimate.status && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="status-badge" style={{ backgroundColor: STATUS_COLOR[estimate.status] + '20', color: STATUS_COLOR[estimate.status], borderColor: STATUS_COLOR[estimate.status] + '40', fontSize: 14, padding: '4px 12px' }}>
            {estimate.status}
          </span>
          {nextStatus && (
            <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => advanceStatus(nextStatus)} disabled={updating}>
              {nextStatus}へ進める <ChevronRight size={14} />
            </button>
          )}
          {estimate.status !== 'ボツ／失注' && estimate.status !== '着工決定' && estimate.status !== '社長チェック' && (
            <button className="btn-president" style={{ fontSize: 13 }} onClick={() => advanceStatus('社長チェック')} disabled={updating}>
              <Send size={13} /> 社長チェックへ送る
            </button>
          )}
          {estimate.status !== 'ボツ／失注' && estimate.status !== '着工決定' && (
            <button className="btn-danger" style={{ fontSize: 13 }} onClick={markBotsu} disabled={updating}>
              ボツ／失注
            </button>
          )}
        </div>
      )}

      <div className="detail-section">
        <div className="detail-row"><span className="detail-label">お客様名</span><span>{estimate.customer_name ?? '—'}</span></div>
        <div className="detail-row"><span className="detail-label">現場住所</span><span>{estimate.address ?? '—'}</span></div>
        <div className="detail-row"><span className="detail-label">担当者</span><span>{estimate.assignee ?? '—'}</span></div>
        <div className="detail-row"><span className="detail-label">見積期限</span><span>{estimate.estimate_deadline ?? '—'}</span></div>
        <div className="detail-row"><span className="detail-label">提出日</span><span>{estimate.submission_date ?? '—'}</span></div>
        {estimate.decision_date && (
          <div className="detail-row"><span className="detail-label">着工決定日</span><span>{estimate.decision_date}</span></div>
        )}
      </div>

      <div className="detail-section">
        <div className="detail-row"><span className="detail-label">見積金額</span><span>{estimate.estimate_amount != null ? `¥${estimate.estimate_amount.toLocaleString()}` : '—'}</span></div>
        <div className="detail-row"><span className="detail-label">原価予定</span><span>{estimate.cost_estimate != null ? `¥${estimate.cost_estimate.toLocaleString()}` : '—'}</span></div>
        <div className="detail-row"><span className="detail-label">粗利予定</span><span>{estimate.gross_profit != null ? `¥${estimate.gross_profit.toLocaleString()}` : '—'}</span></div>
      </div>

      {estimate.request_content && (
        <div className="detail-section">
          <p className="detail-label">依頼内容</p>
          <p style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{estimate.request_content}</p>
        </div>
      )}

      {estimate.notes && (
        <div className="detail-section">
          <p className="detail-label">メモ</p>
          <p style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{estimate.notes}</p>
        </div>
      )}

      {estimate.rejection_reason && (
        <div className="detail-section" style={{ borderLeft: '3px solid #ef4444', paddingLeft: 12 }}>
          <p className="detail-label">ボツ理由</p>
          <p style={{ marginTop: 4 }}>{estimate.rejection_reason}</p>
        </div>
      )}

      {id && <TaskList refId={id} refType="estimate" />}

    </div>
  )
}

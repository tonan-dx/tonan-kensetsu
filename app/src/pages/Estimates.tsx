import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import type { Estimate, EstimateStatus, Assignee } from '../types'

const ASSIGNEES: Assignee[] = ['長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '山崎', '幹子', '佐野', '上野', '岩洞', '小笠原']

const STATUS_COLOR: Record<string, string> = {
  '見積書作成前': '#9ca3af',
  '見積書作成中': '#3b82f6',
  '社長チェック':  '#f59e0b',
  'お客様へ提出':  '#8b5cf6',
  '着工決定':      '#10b981',
  'ボツ／失注':    '#ef4444',
}

const STATUS_ORDER: EstimateStatus[] = [
  '見積書作成前', '見積書作成中', '社長チェック', 'お客様へ提出', '着工決定', 'ボツ／失注',
]

export default function Estimates() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterAssignee, setFilterAssignee] = useState<string>('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/estimates${showAll ? '?show_all=true' : ''}`)
      .then(r => r.json())
      .then(data => { setEstimates(data); setLoading(false) })
  }, [showAll])

  const filtered = estimates
    .filter(e => !filterStatus || e.status === filterStatus)
    .filter(e => !filterAssignee || e.assignee === filterAssignee)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">見積管理</h1>
        <Link to="/estimates/new" className="btn-primary">
          <Plus size={18} /> 新規
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button
          className={filterStatus === '' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilterStatus('')}
        >すべて</button>
        {STATUS_ORDER.filter(s => showAll || s !== 'ボツ／失注').map(s => (
          <button
            key={s}
            className={filterStatus === s ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterStatus(s)}
            style={{ borderColor: STATUS_COLOR[s], color: filterStatus === s ? '#fff' : STATUS_COLOR[s], backgroundColor: filterStatus === s ? STATUS_COLOR[s] : undefined }}
          >{s}</button>
        ))}
        <button
          className="filter-btn"
          onClick={() => { setShowAll(v => !v); setFilterStatus('') }}
          style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}
        >{showAll ? 'ボツを隠す' : 'ボツも表示'}</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        <button
          className={filterAssignee === '' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilterAssignee('')}
        >全員</button>
        {ASSIGNEES.map(a => (
          <button
            key={a}
            className={filterAssignee === a ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterAssignee(a)}
          >{a}</button>
        ))}
      </div>

      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <p className="empty-text">見積案件がありません</p>
      ) : (
        <div className="card-list">
          {filtered.map(e => (
            <Link key={e.id} to={`/estimates/${e.id}`} className="card">
              <div className="card-header">
                <span className="card-title">{e.title}</span>
                {e.status && (
                  <span className="status-badge" style={{ backgroundColor: STATUS_COLOR[e.status] + '20', color: STATUS_COLOR[e.status], borderColor: STATUS_COLOR[e.status] + '40' }}>
                    {e.status}
                  </span>
                )}
              </div>
              <div className="card-meta">
                {e.customer_name && <span>{e.customer_name}</span>}
                {e.assignee && <span>担当: {e.assignee}</span>}
                {e.estimate_deadline && <span>期限: {e.estimate_deadline}</span>}
                {e.estimate_amount != null && (
                  <span>¥{e.estimate_amount.toLocaleString()}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

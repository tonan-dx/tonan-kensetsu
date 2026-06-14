import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, CheckCircle, Circle } from 'lucide-react'
import type { SafetyRecord } from '../types'

export default function Safety() {
  const [records, setRecords] = useState<SafetyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterConfirmed, setFilterConfirmed] = useState<'all' | 'unconfirmed' | 'confirmed'>('all')

  useEffect(() => {
    fetch('/api/safety')
      .then(r => r.json())
      .then(data => { setRecords(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = records.filter(r => {
    if (filterConfirmed === 'unconfirmed') return !r.confirmed
    if (filterConfirmed === 'confirmed') return r.confirmed
    return true
  })

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">安全管理</h1>
        <Link to="/safety/new" className="btn-primary">
          <Plus size={18} /> 新規
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['all', 'unconfirmed', 'confirmed'] as const).map(f => (
          <button
            key={f}
            className={filterConfirmed === f ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterConfirmed(f)}
          >
            {f === 'all' ? 'すべて' : f === 'unconfirmed' ? '未確認' : '確認済み'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <p className="empty-text">安全記録がありません</p>
      ) : (
        <div className="card-list">
          {filtered.map(r => (
            <Link key={r.id} to={`/safety/${r.id}`} className="card">
              <div className="card-header">
                <span className="card-title">{r.title || '（タイトルなし）'}</span>
                {r.confirmed
                  ? <CheckCircle size={18} color="#16a34a" />
                  : <Circle size={18} color="#94a3b8" />
                }
              </div>
              <div className="card-meta">
                {r.date && <span>{r.date}</span>}
                {r.project && <span>{r.project.name}</span>}
                {r.recorder && <span>記入: {r.recorder}</span>}
                {r.near_miss && <span className="safety-nearmiss-tag">ヒヤリハット</span>}
                {r.hazard && <span className="safety-hazard-tag">危険箇所</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

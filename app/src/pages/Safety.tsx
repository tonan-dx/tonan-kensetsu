import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, CheckCircle, Circle, Users } from 'lucide-react'
import type { SafetyRecord } from '../types'
import { useOfficeFilter, matchesOffice } from '../lib/office'
import { useRefetchOnFocus } from '../lib/useRefetchOnFocus'

const ALL_MEMBERS = ['長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '山崎', '幹子', '佐野', '上野', '岩洞', '小笠原']
const TOTAL_MEMBERS = ALL_MEMBERS.length
const today = new Date().toISOString().slice(0, 10)

export default function Safety() {
  const [records, setRecords] = useState<SafetyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterConfirmed, setFilterConfirmed] = useState<'all' | 'unconfirmed' | 'confirmed'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)
  const { loc } = useOfficeFilter()

  const load = () => {
    fetch('/api/safety')
      .then(r => r.json())
      .then(data => { setRecords(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])
  useRefetchOnFocus(load)

  const toggleMember = async (record: SafetyRecord, name: string) => {
    if (toggling) return
    setToggling(true)
    const current = record.confirmed_by ?? []
    const next = current.includes(name)
      ? current.filter(n => n !== name)
      : [...current, name]
    const updated = await fetch(`/api/safety/${record.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed_by: next }),
    }).then(r => r.json()).catch(() => null)
    if (updated) setRecords(rs => rs.map(r => r.id === record.id ? updated : r))
    setToggling(false)
  }

  const filtered = records.filter(r => {
    if (filterConfirmed === 'unconfirmed') return !r.confirmed
    if (filterConfirmed === 'confirmed') return r.confirmed
    return true
  }).filter(r => matchesOffice(r.office, loc))

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
          {filtered.map(r => {
            const isToday = r.date === today
            const confirmedList = r.confirmed_by ?? []
            const isExpanded = expandedId === r.id

            return (
              <div key={r.id} className="card" style={{ display: 'block', padding: 0 }}>
                <Link to={`/safety/${r.id}`} className="card-inner" style={{ display: 'block', padding: '14px 16px' }}>
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
                    {r.near_miss && <span className="safety-nearmiss-tag">ヒヤリハット</span>}
                    {r.hazard && <span className="safety-hazard-tag">危険箇所</span>}
                  </div>
                  <div className="card-circulation">
                    <Users size={12} />
                    <span className={`circulation-mini${confirmedList.length === TOTAL_MEMBERS ? ' done' : ''}`}>
                      {confirmedList.length}/{TOTAL_MEMBERS} 人確認
                    </span>
                    <div className="circulation-mini-bar">
                      <div
                        className="circulation-mini-fill"
                        style={{ width: `${(confirmedList.length / TOTAL_MEMBERS) * 100}%` }}
                      />
                    </div>
                  </div>
                </Link>

                {isToday && (
                  <>
                    <button
                      className={`circulation-toggle-btn${isExpanded ? ' open' : ''}`}
                      onClick={e => { e.preventDefault(); setExpandedId(isExpanded ? null : r.id) }}
                    >
                      <Users size={14} />
                      回覧確認
                      <span className="circulation-toggle-arrow">{isExpanded ? '▲' : '▼'}</span>
                    </button>

                    {isExpanded && (
                      <div className="circulation-inline">
                        <div className="circulation-grid">
                          {ALL_MEMBERS.map(name => {
                            const isConfirmed = confirmedList.includes(name)
                            return (
                              <button
                                key={name}
                                className={`circulation-btn${isConfirmed ? ' confirmed' : ''}`}
                                onClick={() => toggleMember(r, name)}
                                disabled={toggling}
                              >
                                {isConfirmed ? <CheckCircle size={15} /> : <Circle size={15} />}
                                {name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

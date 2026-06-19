import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, CheckCircle, Circle, Users, Send } from 'lucide-react'
import type { SafetyRecord } from '../types'
import TaskList from '../components/TaskList'
import PhotoUpload from '../components/PhotoUpload'

const ALL_MEMBERS = ['長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '山崎', '幹子', '佐野', '上野', '岩洞', '小笠原']

export default function SafetyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState<SafetyRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/safety/${id}`)
      .then(r => r.json())
      .then(data => { setRecord(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!confirm('この安全記録を削除しますか？')) return
    await fetch(`/api/safety/${id}`, { method: 'DELETE' })
    navigate('/safety')
  }

  const sendToPresident = async () => {
    if (!record || sending) return
    setSending(true)
    const res = await fetch(`/api/safety/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: false }),
    })
    const updated = await res.json()
    if (updated) setRecord(updated)
    setSending(false)
  }

  const toggleMember = async (name: string) => {
    if (!record || toggling) return
    setToggling(true)
    const current = record.confirmed_by ?? []
    const next = current.includes(name)
      ? current.filter(n => n !== name)
      : [...current, name]
    const updated = await fetch(`/api/safety/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed_by: next }),
    }).then(r => r.json()).catch(() => null)
    if (updated) setRecord(updated)
    setToggling(false)
  }

  if (loading) return <div className="loading">読み込み中...</div>
  if (!record) return <div className="loading">記録が見つかりません</div>

  const confirmedList = record.confirmed_by ?? []
  const confirmedCount = confirmedList.length
  const total = ALL_MEMBERS.length

  const textFields = [
    { label: 'KY活動記録', value: record.ky_activity },
    { label: '安全日誌', value: record.safety_log },
    { label: 'ヒヤリハット', value: record.near_miss },
    { label: '危険箇所', value: record.hazard },
    { label: '是正対応', value: record.corrective_action },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1 className="page-title">{record.title || '安全記録'}</h1>
        <div className="header-actions">
          <Link to={`/safety/${id}/edit`} className="btn-icon"><Pencil size={18} /></Link>
          <button className="btn-icon danger" onClick={handleDelete}><Trash2 size={18} /></button>
        </div>
      </div>

      <div className="president-check-bar">
        {!record.confirmed ? (
          <span className="president-check-active">社長確認一覧に表示中</span>
        ) : (
          <button className="btn-president" onClick={sendToPresident} disabled={sending}>
            <Send size={14} /> 社長確認へ再送する
          </button>
        )}
      </div>

      <div className="detail-card">
        {record.date && (
          <div className="detail-row">
            <span className="detail-label">日付</span>
            <span>{record.date}</span>
          </div>
        )}
        {record.project && (
          <div className="detail-row">
            <span className="detail-label">関連工事</span>
            <Link to={`/projects/${record.project_id}`} style={{ color: 'var(--blue)' }}>{record.project.name}</Link>
          </div>
        )}
        {textFields.filter(f => f.value).map(f => (
          <div key={f.label} className="detail-row detail-row-block">
            <span className="detail-label">{f.label}</span>
            <span className="detail-text-value">{f.value}</span>
          </div>
        ))}
      </div>

      {id && <PhotoUpload refId={id} refType="safety" />}
      {id && <TaskList refId={id} refType="safety" />}

      <div className="detail-section-card">
        <div className="circulation-header">
          <div className="circulation-title">
            <Users size={16} />
            回覧確認
          </div>
          <div className={`circulation-count${confirmedCount === total ? ' done' : ''}`}>
            {confirmedCount}/{total} 人確認済み
          </div>
        </div>
        <div className="circulation-progress">
          <div
            className="circulation-progress-bar"
            style={{ width: `${(confirmedCount / total) * 100}%` }}
          />
        </div>
        <div className="circulation-grid">
          {ALL_MEMBERS.map(name => {
            const isConfirmed = confirmedList.includes(name)
            return (
              <button
                key={name}
                className={`circulation-btn${isConfirmed ? ' confirmed' : ''}`}
                onClick={() => toggleMember(name)}
                disabled={toggling}
              >
                {isConfirmed ? <CheckCircle size={15} /> : <Circle size={15} />}
                {name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

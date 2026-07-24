import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, CheckCircle, Circle, Users } from 'lucide-react'
import type { Notice } from '../types'
import AttachmentBox from '../components/AttachmentBox'

const ALL_MEMBERS = ['長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '山崎', '幹子', '佐野', '上野', '岩洞', '小笠原']

// kind='minutes' のときは議事録（お知らせDBに 種別=議事録 で相乗り）として扱う
export default function NoticeDetail({ kind = 'notice' }: { kind?: 'notice' | 'minutes' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isMinutes = kind === 'minutes'
  const basePath = isMinutes ? '/meeting/minutes' : '/notices'
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    fetch(`/api/notices/${id}`).then(r => r.json()).then(data => {
      setNotice(data)
      setLoading(false)
    })
  }, [id])

  const handleDelete = async () => {
    if (!confirm(`この${isMinutes ? '議事録' : 'お知らせ'}を削除しますか？`)) return
    await fetch(`/api/notices/${id}`, { method: 'DELETE' })
    navigate(isMinutes ? '/meeting' : '/notices')
  }

  const toggleMember = async (name: string) => {
    if (!notice || toggling) return
    setToggling(true)
    const current = notice.confirmed_by ?? []
    const next = current.includes(name)
      ? current.filter(n => n !== name)
      : [...current, name]
    const updated = await fetch(`/api/notices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed_by: next }),
    }).then(r => r.json()).catch(() => null)
    if (updated) setNotice(updated)
    setToggling(false)
  }

  if (loading) return <div className="loading">読み込み中...</div>
  if (!notice) return <div className="loading">{isMinutes ? '議事録' : 'お知らせ'}が見つかりません</div>

  const confirmedList = notice.confirmed_by ?? []
  const confirmedCount = confirmedList.length
  const total = ALL_MEMBERS.length
  const unconfirmedMembers = ALL_MEMBERS.filter(m => !confirmedList.includes(m))
  const unconfirmedCount = unconfirmedMembers.length

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1 className="page-title" style={{ flex: 1 }}>{notice.title}</h1>
        <div className="header-actions">
          <Link to={`${basePath}/${id}/edit`} className="btn-icon"><Pencil size={18} /></Link>
          <button className="btn-icon danger" onClick={handleDelete}><Trash2 size={18} /></button>
        </div>
      </div>

      <div className="detail-card">
        {notice.date && (
          <div className="detail-row">
            <span className="detail-label">日付</span>
            <span>{notice.date}</span>
          </div>
        )}
        {notice.poster && (
          <div className="detail-row">
            <span className="detail-label">投稿者</span>
            <span>{notice.poster}</span>
          </div>
        )}
      </div>

      {notice.content && (
        <div className="notice-body-card">
          <p className="notice-body">{notice.content}</p>
        </div>
      )}

      <div className="detail-section-card">
        <AttachmentBox refId={notice.id} refType={isMinutes ? 'minutes' : 'notice'} />
      </div>

      <div className="detail-section-card">
        <div className="circulation-header">
          <div className="circulation-title">
            <Users size={16} />
            回覧確認
          </div>
          <div className={`circulation-count${confirmedCount === total ? ' done' : ''}`}>
            {confirmedCount}/{total} 人確認済み
            {unconfirmedCount > 0 && <span className="circulation-unseen">未確認 {unconfirmedCount}名</span>}
          </div>
        </div>
        <div className="circulation-progress">
          <div
            className="circulation-progress-bar"
            style={{ width: `${(confirmedCount / total) * 100}%` }}
          />
        </div>
        {unconfirmedCount > 0 && (
          <div className="circulation-unseen-list">
            <span className="circulation-unseen-label">見ていない人：</span>
            {unconfirmedMembers.join('、')}
          </div>
        )}
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

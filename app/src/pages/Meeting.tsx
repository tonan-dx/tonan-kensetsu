import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Users, ChevronRight, MessageSquare, FileText } from 'lucide-react'
import type { Task, Notice } from '../types'
import { useOfficeFilter } from '../lib/office'
import { useRefetchOnFocus } from '../lib/useRefetchOnFocus'
import { AGENDA_REF, thisFriday, formatMeetingDate } from '../lib/meeting'

interface MeetingRow { date: string; agenda: number; minutes: number }

export default function Meeting() {
  const navigate = useNavigate()
  const { loc } = useOfficeFilter()
  const [rows, setRows] = useState<MeetingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pickDate, setPickDate] = useState(thisFriday())

  const load = () => {
    Promise.all([
      fetch(`/api/checklist?ref_type=${encodeURIComponent(AGENDA_REF)}`).then(r => r.json()).catch(() => []),
      fetch('/api/notices?kind=minutes').then(r => r.json()).catch(() => []),
    ]).then(([a, m]: [Task[], Notice[]]) => {
      const map = new Map<string, MeetingRow>()
      const get = (d: string) => {
        let row = map.get(d)
        if (!row) { row = { date: d, agenda: 0, minutes: 0 }; map.set(d, row) }
        return row
      }
      if (Array.isArray(a)) a.forEach(t => {
        const d = (t.ref_id ?? '').slice(0, 10)
        if (/^\d{4}-\d{2}-\d{2}$/.test(d) && (!t.office || loc === 'all' || t.office === loc)) get(d).agenda++
      })
      if (Array.isArray(m)) m.forEach(n => {
        const d = (n.date ?? '').slice(0, 10)
        if (/^\d{4}-\d{2}-\d{2}$/.test(d) && (!n.office || loc === 'all' || n.office === loc)) get(d).minutes++
      })
      setRows([...map.values()].sort((x, y) => y.date.localeCompare(x.date)))
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [loc])
  useRefetchOnFocus(load)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">金曜会議</h1>
      </div>

      {/* 今週（または指定日）の会議を開く */}
      <div className="detail-section-card">
        <div className="meeting-open-row">
          <input type="date" className="task-date" value={pickDate} onChange={e => setPickDate(e.target.value)} />
          <button className="btn-primary" onClick={() => navigate(`/meeting/date/${pickDate}`)}>
            <Plus size={16} /> この日の会議を開く
          </button>
        </div>
        <p className="meeting-open-hint">基本は毎週金曜16:30。日付を選んで会議を開くと、議題の追加・議事録・車検・資格の一覧が使えます。</p>
      </div>

      {/* 会議一覧（日付・新しい順） */}
      {loading ? <div className="loading">読み込み中...</div> : rows.length === 0 ? (
        <p className="empty-text">まだ会議がありません。上の「この日の会議を開く」から始めてください。</p>
      ) : (
        <div className="card-list">
          {rows.map(r => (
            <Link to={`/meeting/date/${r.date}`} key={r.date} className="card meeting-row">
              <div className="meeting-row-head">
                <Users size={16} className="icon-blue" />
                <span className="meeting-row-date">{formatMeetingDate(r.date)}</span>
                <ChevronRight size={16} className="meeting-row-chev" />
              </div>
              <div className="meeting-row-counts">
                <span><MessageSquare size={13} /> 議題 {r.agenda}</span>
                <span><FileText size={13} /> 議事録 {r.minutes}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

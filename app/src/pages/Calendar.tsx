import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CalendarOff, CalendarPlus } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, addWeeks, addDays, eachDayOfInterval,
  isSameMonth, format,
} from 'date-fns'
import type { Project, DailyReport, Notice, Estimate, SafetyRecord, Contact, Task } from '../types'
import { useOfficeFilter, matchesOffice } from '../lib/office'
import { isLeave, parseLeave, leaveLabel } from '../lib/leave'
import { isPlan, planLabel } from '../lib/plan'
import LeaveModal from '../components/LeaveModal'
import PlanModal from '../components/PlanModal'

/** カレンダーに載せる予定の種類。表示順・色・ラベルの真実源。 */
const TYPE_META = {
  start:    { label: '着工',     color: '#2563eb' },
  end:      { label: '完了',     color: '#16a34a' },
  billing:  { label: '請求',     color: '#9333ea' },
  payment:  { label: '入金',     color: '#0891b2' },
  report:   { label: '日報',     color: '#f59e0b' },
  notice:   { label: 'お知らせ', color: '#dc2626' },
  estimate: { label: '見積',     color: '#db2777' },
  safety:   { label: '安全',     color: '#b45309' },
  contact:  { label: '連絡',     color: '#0d9488' },
  task:     { label: 'ToDo',     color: '#64748b' },
  leave:    { label: '休み',     color: '#e11d48' },
  plan:     { label: '予定',     color: '#4338ca' },
} as const

type EventKind = keyof typeof TYPE_META
const KIND_ORDER = Object.keys(TYPE_META) as EventKind[]

interface CalEvent {
  key: string
  dateKey: string   // 'yyyy-MM-dd'
  kind: EventKind
  title: string
  link: string | null
  office: string | null
}

type ViewMode = 'month' | 'week' | 'day'
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/** 日時文字列を 'yyyy-MM-dd' のキーに正規化（タイムゾーンの影響を避けるため先頭10文字を採用） */
function toKey(s: string | null | undefined): string | null {
  if (!s) return null
  return s.slice(0, 10)
}

const TASK_REF_ROUTE: Record<string, string> = {
  project: 'projects',
  estimate: 'estimates',
  safety: 'safety',
}

function buildEvents(data: {
  projects: Project[]; reports: DailyReport[]; notices: Notice[]
  estimates: Estimate[]; safety: SafetyRecord[]; contacts: Contact[]; tasks: Task[]
}): CalEvent[] {
  const events: CalEvent[] = []
  const push = (
    id: string, kind: EventKind, date: string | null | undefined,
    title: string, link: string | null, office: string | null,
  ) => {
    const dateKey = toKey(date)
    if (!dateKey) return
    events.push({ key: `${kind}-${id}`, dateKey, kind, title, link, office })
  }

  for (const p of data.projects) {
    const link = `/projects/${p.id}`
    push(p.id, 'start',   p.start_date,   p.name, link, p.office)
    push(p.id, 'end',     p.end_date,     p.name, link, p.office)
    push(p.id, 'billing', p.billing_date, p.name, link, p.office)
    push(p.id, 'payment', p.payment_date, p.name, link, p.office)
  }
  for (const r of data.reports) {
    push(r.id, 'report', r.report_date, r.project?.name ?? r.title, `/reports/${r.id}`, r.office)
  }
  for (const n of data.notices) {
    push(n.id, 'notice', n.date, n.title, `/notices/${n.id}`, n.office)
  }
  for (const e of data.estimates) {
    const link = `/estimates/${e.id}`
    push(`${e.id}-dl`, 'estimate', e.estimate_deadline, `期限: ${e.title}`, link, e.office)
    push(`${e.id}-sb`, 'estimate', e.submission_date,   `提出: ${e.title}`, link, e.office)
    push(`${e.id}-dc`, 'estimate', e.decision_date,     `決定: ${e.title}`, link, e.office)
  }
  for (const s of data.safety) {
    push(s.id, 'safety', s.date, s.title, `/safety/${s.id}`, s.office)
  }
  for (const c of data.contacts) {
    push(c.id, 'contact', c.date, c.subject, `/contacts/${c.id}`, c.office)
  }
  for (const t of data.tasks) {
    if (isLeave(t)) {
      const { half } = parseLeave(t.ref_id)
      push(t.id, 'leave', t.due_date, leaveLabel(t.assignee ?? '', half), null, t.office)
      continue
    }
    if (isPlan(t)) {
      push(t.id, 'plan', t.due_date, planLabel(t.name, t.ref_id, t.assignee), null, t.office)
      continue
    }
    if (t.done) continue
    const route = t.ref_type ? TASK_REF_ROUTE[t.ref_type] : undefined
    const link = route && t.ref_id ? `/${route}/${t.ref_id}` : null
    push(t.id, 'task', t.due_date, t.name, link, t.office)
  }
  return events
}

export default function Calendar() {
  const navigate = useNavigate()
  const { loc } = useOfficeFilter()
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)

  const loadEvents = useCallback(() => {
    const j = (p: string) => fetch(p).then(r => r.json()).catch(() => [])
    Promise.all([
      j('/api/projects'), j('/api/reports'), j('/api/notices'),
      j('/api/estimates'), j('/api/safety'), j('/api/contacts'), j('/api/checklist'),
    ]).then(([projects, reports, notices, estimates, safety, contacts, tasks]) => {
      setEvents(buildEvents({
        projects: arr(projects), reports: arr(reports), notices: arr(notices),
        estimates: arr(estimates), safety: arr(safety), contacts: arr(contacts), tasks: arr(tasks),
      }))
      setLoading(false)
    })
  }, [])
  useEffect(() => { loadEvents() }, [loadEvents])

  // 拠点フィルター＋日付キーでグルーピング（種類順にソート）
  const eventsByKey = useMemo(() => {
    const map: Record<string, CalEvent[]> = {}
    for (const e of events) {
      if (!matchesOffice(e.office, loc)) continue
      ;(map[e.dateKey] ??= []).push(e)
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
    }
    return map
  }, [events, loc])

  const todayKey = format(new Date(), 'yyyy-MM-dd')

  const goPrev = () => setCursor(c => view === 'month' ? addMonths(c, -1) : view === 'week' ? addWeeks(c, -1) : addDays(c, -1))
  const goNext = () => setCursor(c => view === 'month' ? addMonths(c, 1)  : view === 'week' ? addWeeks(c, 1)  : addDays(c, 1))
  const goToday = () => setCursor(new Date())

  const rangeLabel = view === 'month'
    ? format(cursor, 'yyyy年 M月')
    : view === 'week'
      ? `${format(startOfWeek(cursor), 'M/d')} 〜 ${format(endOfWeek(cursor), 'M/d')}`
      : `${format(cursor, 'yyyy年 M月d日')} (${WEEKDAYS[cursor.getDay()]})`

  const openDay = (d: Date) => { setCursor(d); setView('day') }

  return (
    <div className="cal-page">
      <div className="page-header">
        <h1 className="page-title">予定カレンダー</h1>
        <div className="cal-view-tabs">
          {(['month', 'week', 'day'] as ViewMode[]).map(v => (
            <button
              key={v}
              className={`cal-view-tab${view === v ? ' active' : ''}`}
              onClick={() => setView(v)}
            >{v === 'month' ? '月' : v === 'week' ? '週' : '日'}</button>
          ))}
        </div>
      </div>

      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={goPrev} aria-label="前へ"><ChevronLeft size={20} /></button>
        <button className="cal-today-btn" onClick={goToday}>今日</button>
        <span className="cal-range">{rangeLabel}</span>
        <button className="cal-nav-btn" onClick={goNext} aria-label="次へ"><ChevronRight size={20} /></button>
      </div>

      <div className="cal-actions">
        <button className="cal-action-btn plan" onClick={() => setPlanOpen(true)}>
          <CalendarPlus size={16} /> 予定登録
        </button>
        <button className="cal-action-btn leave" onClick={() => setLeaveOpen(true)}>
          <CalendarOff size={16} /> 休み登録
        </button>
      </div>

      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : (
        <div className="cal-body">
          {view === 'month' && (
            <MonthView cursor={cursor} eventsByKey={eventsByKey} todayKey={todayKey} onOpenDay={openDay} onGo={navigate} />
          )}
          {view === 'week' && (
            <DayListView
              days={eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) })}
              eventsByKey={eventsByKey} todayKey={todayKey} onGo={navigate}
            />
          )}
          {view === 'day' && (
            <DayListView days={[cursor]} eventsByKey={eventsByKey} todayKey={todayKey} onGo={navigate} large />
          )}
        </div>
      )}

      <div className="cal-legend">
        {KIND_ORDER.map(k => (
          <span key={k} className="cal-legend-item">
            <span className="cal-dot" style={{ background: TYPE_META[k].color }} />{TYPE_META[k].label}
          </span>
        ))}
      </div>

      {leaveOpen && (
        <LeaveModal
          defaultDate={format(cursor, 'yyyy-MM-dd')}
          loc={loc}
          onClose={() => setLeaveOpen(false)}
          onChanged={loadEvents}
        />
      )}
      {planOpen && (
        <PlanModal
          defaultDate={format(cursor, 'yyyy-MM-dd')}
          loc={loc}
          onClose={() => setPlanOpen(false)}
          onChanged={loadEvents}
        />
      )}
    </div>
  )
}

function arr<T>(x: unknown): T[] { return Array.isArray(x) ? x as T[] : [] }

/** 月ビュー：マスは日付＋色ドットのみ。下に当月の予定リストを表示。マスをタップで日ビューへ。 */
function MonthView({ cursor, eventsByKey, todayKey, onOpenDay, onGo }: {
  cursor: Date
  eventsByKey: Record<string, CalEvent[]>
  todayKey: string
  onOpenDay: (d: Date) => void
  onGo: (path: string) => void
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor)),
    end: endOfWeek(endOfMonth(cursor)),
  })
  // 当月の予定を日付順に並べたリスト（カレンダー下部に表示）
  const monthList = eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) })
    .flatMap(d => (eventsByKey[format(d, 'yyyy-MM-dd')] ?? []).map(e => ({ e, d })))

  return (
    <div className="cal-month">
      <div className="cal-grid cal-grid-head">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`cal-weekday${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}`}>{w}</div>
        ))}
      </div>
      <div className="cal-grid cal-grid-body">
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const kinds = [...new Set((eventsByKey[key] ?? []).map(e => e.kind))]
          const dow = day.getDay()
          return (
            <button
              key={key}
              className={`cal-cell${isSameMonth(day, cursor) ? '' : ' out'}`}
              onClick={() => onOpenDay(day)}
            >
              <span className={`cal-cell-num${key === todayKey ? ' today' : ''}${dow === 0 ? ' sun' : dow === 6 ? ' sat' : ''}`}>
                {day.getDate()}
              </span>
              <span className="cal-cell-dots">
                {kinds.slice(0, 5).map(k => (
                  <span key={k} className="cal-cell-dot" style={{ background: TYPE_META[k].color }} />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <div className="cal-month-list">
        <div className="cal-month-list-title">{format(cursor, 'M月')}の予定・更新</div>
        {monthList.length === 0 ? (
          <div className="cal-day-empty">この月の予定はありません</div>
        ) : monthList.map(({ e, d }) => (
          <button
            key={e.key}
            className={`cal-mrow${e.link ? '' : ' nolink'}`}
            onClick={() => e.link && onGo(e.link)}
          >
            <span className="cal-mrow-date">{format(d, 'M/d')} ({WEEKDAYS[d.getDay()]})</span>
            <span className="cal-event-tag" style={{ color: TYPE_META[e.kind].color }}>{TYPE_META[e.kind].label}</span>
            <span className="cal-event-title">{e.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** 週・日ビュー：日ごとのセクションを縦に並べ、予定をリスト表示。会議で見やすい形。 */
function DayListView({ days, eventsByKey, todayKey, onGo, large }: {
  days: Date[]
  eventsByKey: Record<string, CalEvent[]>
  todayKey: string
  onGo: (path: string) => void
  large?: boolean
}) {
  return (
    <div className="cal-daylist">
      {days.map(day => {
        const key = format(day, 'yyyy-MM-dd')
        const evs = eventsByKey[key] ?? []
        const dow = day.getDay()
        return (
          <div key={key} className={`cal-day-section${large ? ' large' : ''}`}>
            <div className={`cal-day-head${key === todayKey ? ' today' : ''}`}>
              <span className={`cal-day-date${dow === 0 ? ' sun' : dow === 6 ? ' sat' : ''}`}>
                {format(day, 'M/d')} ({WEEKDAYS[dow]})
              </span>
              {key === todayKey && <span className="cal-today-badge">今日</span>}
              <span className="cal-day-count">{evs.length} 件</span>
            </div>
            {evs.length === 0 ? (
              <div className="cal-day-empty">予定なし</div>
            ) : (
              <div className="cal-day-events">
                {evs.map(e => (
                  <button
                    key={e.key}
                    className={`cal-event-row${e.link ? '' : ' nolink'}`}
                    onClick={() => e.link && onGo(e.link)}
                  >
                    <span className="cal-dot" style={{ background: TYPE_META[e.kind].color }} />
                    <span className="cal-event-tag" style={{ color: TYPE_META[e.kind].color }}>{TYPE_META[e.kind].label}</span>
                    <span className="cal-event-title">{e.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, CalendarDays, Check, X, Pencil, MapPin } from 'lucide-react'
import type { Project, ProjectCategory } from '../types'
import { useOfficeFilter, matchesOffice } from '../lib/office'
import { useRefetchOnFocus } from '../lib/useRefetchOnFocus'
import { STATUS_COLORS, displayStatus } from '../lib/projectStatus'

// 検索用の表記ゆれ吸収。住所は「1-2-3」「１−２−３」「1‐2‐3」などバラバラに入力されるため、
// 検索する側・される側の両方をこの形に揃えてから比較する。
function normalizeForSearch(s: string): string {
  return s
    .normalize('NFKC')                 // 全角英数字・半角カナ → 標準形
    .replace(/[‐‑‒–—―ー−ｰ]/g, '-')     // ハイフン・ダッシュ・長音記号をすべて '-' に統一
    .replace(/[\s　]+/g, '')            // 空白は無視（「盛岡市 ○○」＝「盛岡市○○」）
    .toLowerCase()
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayLocal(): string {
  return ymd(new Date())
}

/** 今週（月曜〜日曜）の範囲。月曜になるとリセットされ、先週の入金は隠れる。 */
function thisWeekRange(): { from: string; to: string } {
  const mon = new Date()
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7))  // 日曜(0)は6日戻す
  const sun = new Date(mon)
  sun.setDate(sun.getDate() + 6)
  return { from: ymd(mon), to: ymd(sun) }
}

/** その日付が今週（月〜日）に入っているか。日付なしは false（＝今週分ではない）。 */
function isThisWeek(date: string | null): boolean {
  if (!date) return false
  const { from, to } = thisWeekRange()
  return date >= from && date <= to
}

/** 今週の範囲ラベル（例: 7/28〜8/3） */
function weekRangeLabel(): string {
  const { from, to } = thisWeekRange()
  const short = (s: string) => {
    const [, m, d] = s.split('-')
    return `${Number(m)}/${Number(d)}`
  }
  return `${short(from)}〜${short(to)}`
}

// 工事一覧カード内の進捗（詳細を開かず、その場で日付＋％を入力できる）
function ProjectProgress({ p, onUpdated }: { p: Project; onUpdated: (u: Project) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(p.progress != null ? String(p.progress) : '')
  const [date, setDate] = useState(p.progress_date ?? todayLocal())
  const [saving, setSaving] = useState(false)

  // Linkの中にあるので、操作時のカード遷移を止める
  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation() }

  const openEdit = (e: React.MouseEvent) => {
    stop(e)
    setVal(p.progress != null ? String(p.progress) : '')
    setDate(p.progress_date ?? todayLocal())
    setEditing(true)
  }

  const save = async (e: React.MouseEvent) => {
    stop(e)
    if (saving) return
    setSaving(true)
    const progress = val === '' ? null : Math.max(1, Math.min(100, Number(val)))
    const updated = await fetch(`/api/projects/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress, progress_date: progress == null ? null : (date || null) }),
    }).then(r => r.ok ? r.json() : null).catch(() => null)
    setSaving(false)
    if (updated) { onUpdated(updated); setEditing(false) }
    else alert('保存に失敗しました。もう一度お試しください。')
  }

  if (editing) {
    return (
      <div className="proj-prog-edit" onClick={stop}>
        <input type="number" className="proj-prog-num" min={1} max={100} step={1} placeholder="％"
          value={val} autoFocus
          onChange={e => setVal(e.target.value === '' ? '' : String(Math.max(1, Math.min(100, Number(e.target.value)))))} />
        <span className="proj-prog-pct">%</span>
        <input type="date" className="proj-prog-date" value={date} onChange={e => setDate(e.target.value)} />
        <button className="proj-prog-save" onClick={save} disabled={saving} title="保存"><Check size={15} /></button>
        <button className="proj-prog-cancel" onClick={e => { stop(e); setEditing(false) }} title="キャンセル"><X size={15} /></button>
      </div>
    )
  }

  if (p.progress == null) {
    return (
      <button className="proj-prog-add" onClick={openEdit}>
        <Plus size={13} /> 進捗を入力
      </button>
    )
  }

  return (
    <div className="proj-prog-view" onClick={openEdit}>
      <span className="progress-bar-track">
        <span className="progress-bar-fill" style={{ width: `${p.progress}%` }} />
      </span>
      <span className="progress-bar-label">{p.progress}%</span>
      {p.progress_date && <span className="proj-prog-date-label">{p.progress_date.replace(/-/g, '/').slice(5)}時点</span>}
      <Pencil size={12} className="proj-prog-pencil" />
    </div>
  )
}

// フィルタ用ステータス（お金の流れ順）。「請求済」は派生（請求待ち＋請求日あり）、displayStatus と完全一致必須。
// 「入金済み」はこのタブを選んだときだけ表示（普段は隠す）。
const STATUSES = ['すべて', '着工前', '進行中', '請求待ち', '請求済', '入金済み'] as const
type StatusFilter = typeof STATUSES[number]
const CATEGORIES: ProjectCategory[] = ['管工事', '土木工事', '水道施設', '舗装', 'とび・土工']
const DIVISIONS = ['民間', '公共', '下請', '積水ハウス', '修繕']

// 7月始まりの年度を返す（例: 2024年7月〜2025年6月 → 2024）
function getFiscalYear(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return m >= 7 ? y : y - 1
}

function fiscalYearLabel(fy: number): string {
  return `${fy}年度`
}

// 現在の年度（ローカル日付・7月始まり）
function currentFiscalYear(): number {
  const d = new Date()
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return getFiscalYear(local) ?? d.getFullYear()
}

const COMPLETED_STATUSES = ['完了', '請求待ち', '入金済み']

// 工事が属する年度：
// - 完了/請求待ち/入金済み → 完了日(竣工日→契約日→登録日)の年度に固定（翌年度へ繰り越さない）
// - 未完了（着工前/進行中/確認待ち） → 現在の年度（6月末の年度切替で翌年度へ繰り越す）
function projectFiscalYear(p: Project): number | null {
  if (COMPLETED_STATUSES.includes(p.status)) {
    return getFiscalYear(p.end_date ?? p.contract_date ?? p.created_at)
  }
  return currentFiscalYear()
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const { loc } = useOfficeFilter()

  // 絞り込み・検索は URL に持たせる。工事詳細から「戻る」で選んだ状態がそのまま復元される。
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const filterStatus: StatusFilter =
    (STATUSES as readonly string[]).includes(params.get('status') ?? '') ? params.get('status') as StatusFilter : 'すべて'
  const yearParam = params.get('year')
  const filterYear: number | 'すべて' =
    yearParam === 'すべて' ? 'すべて'
    : yearParam && !Number.isNaN(Number(yearParam)) ? Number(yearParam)
    : currentFiscalYear()
  const filterCategory: ProjectCategory | null =
    (CATEGORIES as string[]).includes(params.get('cat') ?? '') ? params.get('cat') as ProjectCategory : null
  const filterDivision: string | null =
    DIVISIONS.includes(params.get('div') ?? '') ? params.get('div') : null
  // 入金済みは既定で「今週入金分」だけ。過去の入金も見たいときだけ true。
  const paidAll = params.get('paid') === 'all'

  // 検索欄の文字は手元の state で持つ（URL を直接 value にすると、日本語の変換中に
  // 再描画で入力が横取りされ、文字が重複・入れ替わる）。確定した文字だけ URL に送る。
  const [searchInput, setSearchInput] = useState(search)
  const composing = useRef(false)
  useEffect(() => { setSearchInput(search) }, [search])  // 「戻る」等で URL 側が変わったら追従

  const onSearchInput = (v: string) => {
    setSearchInput(v)
    if (!composing.current) setParam({ q: v })  // 変換中は送らない（確定時にまとめて送る）
  }

  // 履歴を増やさない（replace）。増やすと「戻る」で絞り込み操作を1つずつ遡ってしまう。
  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => { if (v == null || v === '') next.delete(k); else next.set(k, v) })
    setParams(next, { replace: true })
  }

  const load = () => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      setProjects(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }
  const updateProject = (u: Project) => setProjects(prev => prev.map(p => p.id === u.id ? u : p))
  useEffect(() => { load() }, [])
  useRefetchOnFocus(load)

  // 存在する年度を降順で列挙（現在の年度は常に含める）
  const fiscalYears = Array.from(
    new Set([currentFiscalYear(), ...projects.map(p => projectFiscalYear(p))].filter((y): y is number => y !== null))
  ).sort((a, b) => b - a)

  // 検索中は「絞り込み（区分・分類・年度・状態）も拠点も無視して全工事から探す」。
  // 以前は絞り込みとAND だったため、入金済み・別年度・別拠点の工事が検索に出てこなかった。
  // スペース区切りは AND（例：「盛岡 外壁」で両方を含む工事）。
  const terms = search.trim().split(/[\s　]+/).filter(Boolean).map(normalizeForSearch)
  const searching = terms.length > 0

  const filtered = projects.filter(p => {
    if (searching) {
      // '|' 区切りで連結（正規化で空白が消えるため、区切りが無いと項目をまたいで誤ヒットする）
      const hay = normalizeForSearch([p.name, p.client_name, p.location, p.assignee].filter(Boolean).join('|'))
      return terms.every(t => hay.includes(t))
    }
    // 表示用ステータス（請求待ち＋請求日→請求済み）で絞り込み
    const matchStatus = filterStatus === 'すべて' || displayStatus(p) === filterStatus
    const matchYear = filterYear === 'すべて' || projectFiscalYear(p) === filterYear
    const matchCategory = !filterCategory || (p.category === filterCategory && p.status !== '入金済み')
    const matchDivision = !filterDivision || p.division === filterDivision
    // 入金済み（完了案件）は既定で隠す。「入金済み」タブ選択時・分類/区分での絞り込み中は表示。
    const matchPaid = filterStatus === '入金済み' || !!filterCategory || !!filterDivision || p.status !== '入金済み'
    // 表示する入金済みは「今週(月〜日)に入金された分」だけ。過去分は「すべて表示」で見られる。
    const matchPaidWeek = paidAll || p.status !== '入金済み' || isThisWeek(p.payment_date)
    return matchStatus && matchYear && matchCategory && matchDivision && matchPaid && matchPaidWeek && matchesOffice(p.office, loc)
  }).sort((a, b) => {
    // 着工日の若い順（早い日付が上）。着工日なしは末尾。
    if (!a.start_date && !b.start_date) return 0
    if (!a.start_date) return 1
    if (!b.start_date) return -1
    return a.start_date.localeCompare(b.start_date)
  })

  // 年度別の区分別 合計（決定済みの全工事・最終金額／拠点フィルタ反映／年度は projectFiscalYear）
  const summary: Record<number, { divs: Record<string, number>; none: number; total: number }> = {}
  projects
    .filter(p => matchesOffice(p.office, loc))
    .forEach(p => {
      const fy = projectFiscalYear(p)
      if (fy == null) return
      const amt = (p.contract_amount ?? 0) + (p.change_amount ?? 0)
      const y = summary[fy] ?? (summary[fy] = { divs: {}, none: 0, total: 0 })
      if (p.division && DIVISIONS.includes(p.division)) y.divs[p.division] = (y.divs[p.division] ?? 0) + amt
      else y.none += amt
      y.total += amt
    })
  // 完工高は「選択中の年度」だけ表示（「すべて」のときは出さない＝年度が増えても見やすく）
  const summaryYears = filterYear === 'すべて'
    ? []
    : Object.keys(summary).map(Number).filter(fy => fy === filterYear)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">工事一覧</h1>
        <Link to="/calendar" className="btn-sm">
          <CalendarDays size={15} /> 予定
        </Link>
        <Link to="/projects/new" className="btn-primary">
          <Plus size={18} /> 新規
        </Link>
      </div>

      <div className="search-bar">
        <Search size={16} className="search-icon" />
        <input
          className="search-input"
          placeholder="工事名・お客様名・住所・担当者で検索"
          value={searchInput}
          onChange={e => onSearchInput(e.target.value)}
          onCompositionStart={() => { composing.current = true }}
          onCompositionEnd={e => { composing.current = false; setParam({ q: e.currentTarget.value }) }}
        />
        {searchInput && (
          <button className="search-clear" onClick={() => { setSearchInput(''); setParam({ q: null }) }} title="検索をやめる">
            <X size={16} />
          </button>
        )}
      </div>

      {/* 検索中は絞り込みタブを隠す（検索は絞り込みを無視して全件から探すため、選択中の表示と食い違わせない） */}
      {!searching && (
        <>
          {/* 工事区分タグ（民間/公共/下請/積水ハウス/修繕） */}
          <div className="filter-tabs">
            {DIVISIONS.map(d => (
              <button
                key={d}
                className={`filter-tab ${filterDivision === d ? 'active' : ''}`}
                onClick={() => setParam({ div: filterDivision === d ? null : d })}
              >
                {d}
              </button>
            ))}
          </div>

          {/* 工事分類タグ（クリックで未入金のみ表示） */}
          <div className="filter-tabs">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`filter-tab ${filterCategory === cat ? 'active' : ''}`}
                onClick={() => setParam(filterCategory === cat ? { cat: null } : { cat, status: null })}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 年度タブ */}
          {fiscalYears.length > 0 && (
            <div className="filter-tabs">
              <button
                className={`filter-tab ${filterYear === 'すべて' ? 'active' : ''}`}
                onClick={() => setParam({ year: 'すべて' })}
              >
                すべて
              </button>
              {fiscalYears.map(fy => (
                <button
                  key={fy}
                  className={`filter-tab ${filterYear === fy ? 'active' : ''}`}
                  onClick={() => setParam({ year: String(fy) })}
                >
                  {fiscalYearLabel(fy)}
                </button>
              ))}
            </div>
          )}

          {/* ステータスタブ（お金の流れ順・折り返しで全部表示。分類タグ選択中は無効化） */}
          {!filterCategory && (
            <div className="filter-tabs filter-tabs-wrap">
              {STATUSES.map(s => (
                <button
                  key={s}
                  className={`filter-tab ${filterStatus === s ? 'active' : ''}`}
                  onClick={() => setParam({ status: s === 'すべて' ? null : s })}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {searching && (
        <p className="filter-notice">
          「{search}」の検索結果 — {filtered.length}件（すべての年度・状態・拠点から検索中）
        </p>
      )}

      {!searching && filterCategory && (
        <p className="filter-notice">
          「{filterCategory}」の未入金工事を表示中 — {filtered.length}件
        </p>
      )}

      {/* 入金済みタブ：既定は今週入金分だけ。過去の入金も見たいときは切り替えられる。 */}
      {!searching && !filterCategory && filterStatus === '入金済み' && (
        <p className="filter-notice">
          {paidAll ? '入金済みをすべて表示中' : `今週（${weekRangeLabel()}）に入金された工事 — ${filtered.length}件`}
          <button
            className="filter-btn"
            onClick={() => setParam({ paid: paidAll ? null : 'all' })}
            style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}
          >{paidAll ? '今週の入金だけ表示' : 'すべての入金済みを表示'}</button>
        </p>
      )}

      {loading ? <div className="loading">読み込み中...</div> : (
        <div className="card-list">
          {filtered.length === 0 ? (
            <p className="empty-text">工事がありません</p>
          ) : filtered.map(p => (
            <Link to={`/projects/${p.id}`} key={p.id} className="card project-row-card">
              <div className="project-row-main">
                <span className={`badge ${STATUS_COLORS[displayStatus(p)] ?? 'badge-gray'}`}>{displayStatus(p)}</span>
                <span className="project-row-name">{p.name}</span>
                {p.division && <span className="badge badge-division">{p.division}</span>}
                {p.category && <span className="badge badge-category">{p.category}</span>}
              </div>
              {/* 工事場所（住所）。件名のすぐ下に出すと現場が一目で分かる */}
              {p.location && (
                <div className="project-row-loc">
                  <MapPin size={13} />
                  <span>{p.location}</span>
                </div>
              )}
              {/* 件名の直下：進捗バー＋その場入力 */}
              <ProjectProgress p={p} onUpdated={updateProject} />
              <div className="project-row-sub">
                {p.client_name && <span>{p.client_name}</span>}
                {p.contract_date && <span className="project-row-date">契約 {p.contract_date.replace(/-/g, '/').slice(0, 10)}</span>}
                {p.assignee && <span>{p.assignee}</span>}
                {p.contract_amount != null && <span className="project-row-amount">¥{p.contract_amount.toLocaleString()}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!searching && summaryYears.length > 0 && (
        <div className="proj-summary">
          <div className="proj-summary-title">
            年度別 完工高（区分別）
            <span className="proj-summary-note">7月〜6月・完了日基準</span>
          </div>
          {summaryYears.map(fy => (
            <div key={fy} className="proj-summary-year">
              <div className="proj-summary-year-head">{fy}年度（{fy}/7〜{fy + 1}/6）</div>
              {DIVISIONS.map(d => (
                <div key={d} className="proj-summary-row">
                  <span className="proj-summary-label">{d}</span>
                  <span className="proj-summary-amount">¥{(summary[fy].divs[d] ?? 0).toLocaleString()}</span>
                </div>
              ))}
              {summary[fy].none > 0 && (
                <div className="proj-summary-row">
                  <span className="proj-summary-label">区分なし</span>
                  <span className="proj-summary-amount">¥{summary[fy].none.toLocaleString()}</span>
                </div>
              )}
              <div className="proj-summary-row total">
                <span className="proj-summary-label">合計</span>
                <span className="proj-summary-amount">¥{summary[fy].total.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

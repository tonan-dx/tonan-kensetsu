import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import type { Project, Task } from '../types'
import { useRefetchOnFocus } from '../lib/useRefetchOnFocus'
import {
  HAICHI_REF, REST_VAL, mondayOf, windowDates, shortDate, weekdayOf,
} from '../lib/haichi'
import { LEAVE_REF, COMPANY_LEAVE, isCompanyLeave } from '../lib/leave'

// 配置表の名簿（元スプレッドシート準拠。変更は依頼で調整）
const PEOPLE = [
  '工藤 照見', '櫻場 敦', '大志田 敏徳', '熊谷 亘', '堀合 浩司', '大森 和夫', '坂井 茂', '高橋 清和',
  '五十嵐 範', '櫻川 一則', '竹田 英憲', '水間 梨都', '晴山 修', '長澤 敬一', '佐々木 貢', '佐々木 (紀)', '上野', '岩洞',
]
const PALETTE = ['#16a34a', '#0d9488', '#0891b2', '#0284c7', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#a16207', '#0ea5e9', '#65a30d', '#c026d3', '#dc2626', '#0f766e']
const DAYS = 14
const kk = (person: string, date: string) => `${person} ${date}`
const ERASE = '__erase__'
const PRINT_STYLE = 'haichi-print-size'
// 進行中の工事に無い現場は「現場ラベル」コマとして notes に 'L:現場名' で保存
const FREE = 'L:'
function labelColor(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

interface Rec { id: string; val: string }

export default function Haichi() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<{ id: string; name: string; color: string; kind: string | null }[]>([])
  const [assign, setAssign] = useState<Map<string, Rec>>(new Map())
  const [comp, setComp] = useState<Map<string, string[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [weekOff, setWeekOff] = useState(0)
  const [brush, setBrush] = useState<string | null>(null)
  const [dropKey, setDropKey] = useState<string | null>(null)

  // 非同期処理から最新値を読むためのミラー（描画には使わない）
  const assignRef = useRef(assign); useEffect(() => { assignRef.current = assign }, [assign])
  const compRef = useRef(comp); useEffect(() => { compRef.current = comp }, [comp])

  const projMap = useMemo(() => new Map(projects.map(p => [p.id, { name: p.name, color: p.color }])), [projects])
  const projMapRef = useRef(projMap); useEffect(() => { projMapRef.current = projMap }, [projMap])

  // コマ1つ分の表示（進行中の工事 または 現場ラベル）
  const valMeta = (val: string): { name: string; color: string } =>
    val.startsWith(FREE) ? { name: val.slice(2), color: labelColor(val.slice(2)) }
      : (projMap.get(val) ?? { name: '（終了した工事）', color: '#64748b' })

  // 配置に使われている現場ラベルを拾って、コマ置き場に出す
  const freeLabels = useMemo(() => {
    const m = new Map<string, { key: string; name: string; color: string }>()
    assign.forEach(r => { if (r.val.startsWith(FREE) && !m.has(r.val)) m.set(r.val, { key: r.val, name: r.val.slice(2), color: labelColor(r.val.slice(2)) }) })
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  }, [assign])

  const paletteItems = [
    ...projects.map(p => ({ key: p.id, name: p.name, color: p.color, kind: p.kind })),
    ...freeLabels.map(l => ({ key: l.key, name: l.name, color: l.color, kind: '現場' as string | null })),
  ]

  const load = () => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()).catch(() => []),
      fetch(`/api/checklist?ref_type=${encodeURIComponent(HAICHI_REF)}`).then(r => r.json()).catch(() => []),
      fetch(`/api/checklist?ref_type=${encodeURIComponent(LEAVE_REF)}`).then(r => r.json()).catch(() => []),
    ]).then(([pj, ha, lv]: [Project[], Task[], Task[]]) => {
      const active = (Array.isArray(pj) ? pj : []).filter(p => p.status === '進行中')
      setProjects(active.map((p, i) => ({ id: p.id, name: p.name, color: PALETTE[i % PALETTE.length], kind: p.division })))

      const am = new Map<string, Rec>()
      ;(Array.isArray(ha) ? ha : []).forEach(t => {
        const person = t.ref_id, date = (t.due_date ?? '').slice(0, 10), val = t.notes
        if (person && date && val) am.set(kk(person, date), { id: t.id, val })
      })
      setAssign(am)

      const cm = new Map<string, string[]>()
      ;(Array.isArray(lv) ? lv : []).forEach(t => {
        if (!isCompanyLeave(t)) return
        const date = (t.due_date ?? '').slice(0, 10); if (!date) return
        cm.set(date, [...(cm.get(date) ?? []), t.id])
      })
      setComp(cm)
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [])
  useRefetchOnFocus(load)

  const start = useMemo(() => { const d = mondayOf(new Date()); d.setDate(d.getDate() + weekOff * 7); return d }, [weekOff])
  const dates = useMemo(() => windowDates(start, DAYS), [start])
  const rangeLabel = `${shortDate(dates[0][0])} 〜 ${shortDate(dates[DAYS - 1][0])}`

  // この2週間で各コマ（工事/現場）が何人日入っているか
  const countByVal = useMemo(() => {
    const winSet = new Set(dates.map(d => d[0]))
    const m = new Map<string, number>()
    assign.forEach((r, k) => {
      const date = k.slice(k.lastIndexOf(' ') + 1)
      if (winSet.has(date)) m.set(r.val, (m.get(r.val) ?? 0) + 1)
    })
    return m
  }, [assign, dates])
  const kindClass = (kind: string | null) => kind === '公共' ? 'k-pub' : kind === '民間' ? 'k-priv' : kind === '下請' ? 'k-sub' : 'k-site'

  // ── 1コマ = 1レコードの書き込み ──
  const upsertCell = async (person: string, date: string, val: string | null) => {
    const k = kk(person, date)
    const rec = assignRef.current.get(k)
    if (val == null) {
      if (!rec) return
      setAssign(prev => { const n = new Map(prev); n.delete(k); return n })
      fetch(`/api/checklist/${rec.id}`, { method: 'DELETE' }).catch(() => {})
      return
    }
    const label = val === REST_VAL ? '休み' : val.startsWith(FREE) ? val.slice(2) : (projMapRef.current.get(val)?.name ?? 'コマ')
    if (rec) {
      setAssign(prev => { const n = new Map(prev); n.set(k, { id: rec.id, val }); return n })
      fetch(`/api/checklist/${rec.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label, notes: val }),
      }).catch(() => {})
    } else {
      const tmpId = `tmp-${k}`
      setAssign(prev => { const n = new Map(prev); n.set(k, { id: tmpId, val }); return n })
      const created = await fetch('/api/checklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label, notes: val, ref_id: person, due_date: date, ref_type: HAICHI_REF, office: null }),
      }).then(r => r.ok ? r.json() : null).catch(() => null)
      setAssign(prev => {
        const n = new Map(prev); const cur = n.get(k)
        if (created && created.id) { if (cur && cur.id === tmpId) n.set(k, { id: created.id, val: cur.val }) }
        else if (cur && cur.id === tmpId) n.delete(k)
        return n
      })
    }
  }

  const applyBrushToCell = (person: string, date: string) => {
    if (brush === null) return
    upsertCell(person, date, brush === ERASE ? null : brush)
  }

  const toggleCompany = async (date: string) => {
    const ids = compRef.current.get(date) ?? []
    if (ids.length) {
      setComp(prev => { const n = new Map(prev); n.delete(date); return n })
      ids.forEach(id => fetch(`/api/checklist/${id}`, { method: 'DELETE' }).catch(() => {}))
    } else {
      setComp(prev => { const n = new Map(prev); n.set(date, ['tmp']); return n })
      const c = await fetch('/api/checklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '会社休み', ref_id: COMPANY_LEAVE, due_date: date, ref_type: LEAVE_REF, office: null }),
      }).then(r => r.ok ? r.json() : null).catch(() => null)
      setComp(prev => { const n = new Map(prev); if (c && c.id) n.set(date, [c.id]); else n.delete(date); return n })
    }
  }

  // 日付見出しタップ：工事ブラシ中＝その現場の人だけ休み／それ以外＝全体休みトグル
  const onDateHead = (date: string) => {
    if (brush && brush !== REST_VAL && brush !== ERASE) {
      for (const p of PEOPLE) {
        const rec = assignRef.current.get(kk(p, date))
        if (rec && rec.val === brush) upsertCell(p, date, REST_VAL)
      }
      return
    }
    toggleCompany(date)
  }

  // ── ドラッグ移動（PC）──
  const dragRef = useRef<{ person: string; date: string } | null>(null)
  const onDrop = async (person: string, date: string) => {
    setDropKey(null)
    const from = dragRef.current; dragRef.current = null
    if (!from || (from.person === person && from.date === date)) return
    const fromVal = assignRef.current.get(kk(from.person, from.date))?.val ?? null
    const toVal = assignRef.current.get(kk(person, date))?.val ?? null
    await upsertCell(person, date, fromVal)
    await upsertCell(from.person, from.date, toVal)
  }

  // ── 印刷（表示中の2週間をA4/A3横で1枚に）──
  // 用紙サイズは @page でしか指定できないので、都度 style を差し替えてから印刷ダイアログを開く
  const printSheet = (size: 'A4' | 'A3') => {
    let el = document.getElementById(PRINT_STYLE) as HTMLStyleElement | null
    if (!el) { el = document.createElement('style'); el.id = PRINT_STYLE; document.head.appendChild(el) }
    el.textContent = `@page { size: ${size} landscape; margin: 8mm; }`
    const cls = size === 'A4' ? 'print-a4' : 'print-a3'
    document.body.classList.remove('print-a4', 'print-a3') // 前回の指定が残っていても混ざらないように
    document.body.classList.add(cls)
    const done = () => { document.body.classList.remove(cls); window.removeEventListener('afterprint', done) }
    window.addEventListener('afterprint', done)
    window.print()
  }
  useEffect(() => () => {
    document.getElementById(PRINT_STYLE)?.remove()
    document.body.classList.remove('print-a4', 'print-a3')
  }, [])

  const brushMeta = brush && brush !== REST_VAL && brush !== ERASE ? valMeta(brush) : null
  const brushLabel = brush === REST_VAL ? '休み' : brush === ERASE ? '消す' : brushMeta ? brushMeta.name : '（工事を選んでください）'
  const brushColor = brush === REST_VAL ? '#e11d48' : brush === ERASE ? '#94a3b8' : brushMeta ? brushMeta.color : '#cbd5e1'

  return (
    <div className="page haichi-page">
      <div className="page-header haichi-header">
        <button className="btn-back haichi-back" onClick={() => navigate('/')}>
          <ArrowLeft size={18} /> 戻る
        </button>
        <h1 className="page-title">現場配置表</h1>
      </div>

      <div className="haichi-note">
        左の <b>工事一覧（進行中）</b> の現場コマを、人 × 日のマスに置きます。工事を選んでマスをタップ（PCはドラッグで移動）。
        コマの数字は「その工事に今 何人日入っているか」。<b>工事を選ぶと、その工事のコマだけ光ります</b>。
        日付見出しタップ＝全体休み／工事を選んでからタップ＝その現場だけ休み。
      </div>

      <div className="haichi-toolbar">
        <div className="period">
          <button onClick={() => setWeekOff(w => w - 1)} aria-label="前の週へ"><ChevronLeft size={18} /></button>
          <span className="rng">{rangeLabel}</span>
          <button onClick={() => setWeekOff(w => w + 1)} aria-label="次の週へ"><ChevronRight size={18} /></button>
          <button className="today" onClick={() => setWeekOff(0)}>今週</button>
        </div>
        <span className="brush-now"><span className="swatch" style={{ background: brushColor }} />いま置く：<b>{brushLabel}</b></span>
        {brush && <button className="btn-ghost" onClick={() => setBrush(null)}>選択解除</button>}
        <span className="print-btns">
          <button className="btn-print" onClick={() => printSheet('A4')} title="表示中の2週間をA4横で印刷">
            <Printer size={15} />A4で印刷
          </button>
          <button className="btn-print" onClick={() => printSheet('A3')} title="表示中の2週間をA3横で印刷">
            <Printer size={15} />A3で印刷
          </button>
        </span>
      </div>

      {/* 印刷時だけ出る見出し（画面では非表示） */}
      <div className="haichi-print-head">
        <span className="pr-title">現場配置表</span>
        <span className="pr-range">{rangeLabel}</span>
      </div>

      <div className="haichi-cols">
      <div className="haichi-palette">
        <div className="hp-title">工事一覧（進行中）<span className="hp-cnt">{projects.length}件</span></div>
        <div className="hp-list">
          {paletteItems.length === 0 && !loading && <span className="hp-empty">「進行中」の工事がありません（工事一覧でステータスを進行中にすると出ます）</span>}
          {paletteItems.map(p => (
            <button key={p.key}
              className={`hp-card${brush === p.key ? ' active' : ''}`}
              style={{ '--jc': p.color } as React.CSSProperties}
              onClick={() => setBrush(brush === p.key ? null : p.key)}>
              <span className="hp-dot" />
              <span className="hp-name">{p.name}</span>
              {p.kind && <span className={`hp-kind ${kindClass(p.kind)}`}>{p.kind}</span>}
              <span className="hp-count">{countByVal.get(p.key) ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="hp-tools">
          <button className={`hp-tool rest${brush === REST_VAL ? ' active' : ''}`} onClick={() => setBrush(brush === REST_VAL ? null : REST_VAL)}>休み</button>
          <button className={`hp-tool erase${brush === ERASE ? ' active' : ''}`} onClick={() => setBrush(brush === ERASE ? null : ERASE)}>消す</button>
        </div>
        <p className="hp-tip">工事を選んでマスをタップ→配置（PCはコマをドラッグで移動）。日付見出しタップ＝全体休み／工事を選んでからタップ＝その現場だけ休み。</p>
      </div>

      {loading ? <div className="loading">読み込み中...</div> : (
        <div className={`haichi-board${brushMeta ? ' focus' : ''}`}>
          <div className="scroll">
            <table className="hgrid">
              <thead>
                <tr>
                  <th className="hname corner">氏名</th>
                  {dates.map(([d, wk]) => (
                    <th key={d} className={`dhead${wk ? ' wknd' : ''}${comp.has(d) ? ' comp' : ''}`}
                      onClick={() => onDateHead(d)} title="タップ：全体休み／工事を選んでタップ：その現場だけ休み">
                      {shortDate(d)}<span className="dh-w">({weekdayOf(d)})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PEOPLE.map(person => (
                  <tr key={person}>
                    <th className="hname">{person}</th>
                    {dates.map(([d, wk]) => {
                      const isComp = comp.has(d)
                      const rec = assign.get(kk(person, d))
                      const k = kk(person, d)
                      return (
                        <td key={d}
                          className={`hcell${wk ? ' wknd' : ''}${isComp ? ' comp' : ''}${dropKey === k ? ' drop' : ''}`}
                          onClick={() => !isComp && applyBrushToCell(person, d)}
                          onDragOver={e => { if (!isComp) { e.preventDefault(); setDropKey(k) } }}
                          onDragLeave={() => setDropKey(null)}
                          onDrop={e => { e.preventDefault(); if (!isComp) onDrop(person, d) }}>
                          {isComp ? (
                            <span className="komacell rest company">会社休み</span>
                          ) : rec ? (
                            rec.val === REST_VAL ? (
                              <span className="komacell rest" draggable onDragStart={() => { dragRef.current = { person, date: d } }}>休み</span>
                            ) : (
                              <span className={`komacell job${brush === rec.val ? ' hit' : ''}`} draggable
                                onDragStart={() => { dragRef.current = { person, date: d } }}
                                style={{ '--jc': valMeta(rec.val).color } as React.CSSProperties}
                                title={valMeta(rec.val).name}>
                                {valMeta(rec.val).name}
                              </span>
                            )
                          ) : null}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
      <p className="haichi-foot">配置は日付ごとに保存されます。週を戻せば過去の配置も見られます。「会社休み」はカレンダーの休みと共有です。</p>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { Task } from '../types'
import { MEMO_REF } from '../lib/memo'

/**
 * 配置表の下の記入枠。表示中の2週間ごとに1枚、自由に書ける（改行そのまま）。
 * タスクDBに ref_type='メモ' で相乗り保存（notes=本文・新APIファイル不要）。
 * 打っている間に自動保存し、枠から離れたときにも保存する。
 */
export default function HaichiMemo({ refId }: { refId: string }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'' | 'saving' | 'saved' | 'error'>('')

  const recId = useRef<string | null>(null)   // 保存先レコード（無ければ初回入力時に作る）
  const savedText = useRef('')                // 最後に保存できた本文
  const liveText = useRef('')                 // いま枠に入っている本文（保存処理から読む）
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persist = async (rid: string, body: string) => {
    if (body === savedText.current) return
    if (!recId.current && !body.trim()) return   // 空のまま無駄なレコードを作らない
    setStatus('saving')
    try {
      if (recId.current) {
        const r = await fetch(`/api/checklist/${recId.current}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: body }),
        })
        if (!r.ok) throw new Error('patch failed')
      } else {
        const r = await fetch('/api/checklist', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '配置メモ', notes: body, ref_id: rid, ref_type: MEMO_REF, office: null }),
        })
        if (!r.ok) throw new Error('post failed')
        const created = await r.json()
        if (!created?.id) throw new Error('no id')
        recId.current = created.id
      }
      savedText.current = body
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  // 週を切り替えたら、書きかけを保存してからその週のメモに入れ替える
  useEffect(() => {
    const rid = refId
    return () => {
      if (timer.current) { clearTimeout(timer.current); timer.current = null }
      if (liveText.current !== savedText.current) persist(rid, liveText.current)
    }
  }, [refId])

  useEffect(() => {
    let alive = true
    setLoading(true); setStatus(''); setText('')
    recId.current = null; savedText.current = ''; liveText.current = ''
    fetch(`/api/checklist?ref_id=${encodeURIComponent(refId)}&ref_type=${encodeURIComponent(MEMO_REF)}`)
      .then(r => r.json())
      .then((d: Task[]) => {
        if (!alive) return
        const rec = Array.isArray(d) && d.length ? d[0] : null
        const body = rec?.notes ?? ''
        recId.current = rec?.id ?? null
        savedText.current = body
        liveText.current = body
        setText(body)
        setLoading(false)
      })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [refId])

  const onChange = (v: string) => {
    setText(v); liveText.current = v; setStatus('')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => persist(refId, v), 1200)
  }

  const flush = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    persist(refId, liveText.current)
  }

  return (
    <div className="hm-box">
      <textarea
        className="hm-input"
        value={text}
        rows={5}
        disabled={loading}
        placeholder={loading ? '' : '研修・イベントの手伝い・連絡事項など、自由に書けます'}
        onChange={e => onChange(e.target.value)}
        onBlur={flush}
      />
      <div className={`hm-state${status === 'error' ? ' err' : ''}`}>
        {status === 'saving' ? '保存中…'
          : status === 'saved' ? '保存しました'
            : status === 'error' ? '保存できませんでした。もう一度お試しください'
              : ''}
      </div>
      {/* 印刷用。textarea は入りきらない分が刷られないので、同じ本文を別に出す */}
      <div className="hm-print">{text}</div>
    </div>
  )
}

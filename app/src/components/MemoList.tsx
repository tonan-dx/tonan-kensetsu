import { useEffect, useState } from 'react'
import { StickyNote, Trash2, Plus } from 'lucide-react'
import type { Task } from '../types'
import { useOfficeFilter } from '../lib/office'
import { MEMO_REF } from '../lib/memo'

/** 工事の覚え書きメモ。タスクとは別に、自由なメモを複数残せる。 */
export default function MemoList({ refId }: { refId: string }) {
  const { loc } = useOfficeFilter()
  const [memos, setMemos] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/checklist?ref_id=${encodeURIComponent(refId)}&ref_type=${encodeURIComponent(MEMO_REF)}`)
      .then(r => r.json())
      .then(d => { setMemos(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [refId])

  const add = async () => {
    if (!text.trim() || saving) return
    setSaving(true)
    const created = await fetch('/api/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: text.trim(),
        ref_type: MEMO_REF,
        ref_id: refId,
        office: loc === 'all' ? null : loc,
      }),
    }).then(r => r.json()).catch(() => null)
    setSaving(false)
    if (!created) { alert('メモの保存に失敗しました。もう一度お試しください。'); return }
    setMemos(prev => [...prev, created])
    setText('')
    setAdding(false)
  }

  const remove = async (mid: string) => {
    await fetch(`/api/checklist/${mid}`, { method: 'DELETE' }).catch(() => null)
    setMemos(prev => prev.filter(m => m.id !== mid))
  }

  return (
    <div className="task-list-section">
      <div className="task-list-header">
        <div className="task-list-title">
          <StickyNote size={16} />
          メモ
          <span className="task-count">{memos.length}件</span>
        </div>
        <button className="task-add-btn" onClick={() => setAdding(a => !a)}>
          <Plus size={16} /> 追加
        </button>
      </div>

      {adding && (
        <div className="task-add-form">
          <textarea
            className="task-input memo-input"
            placeholder="メモを入力...（工事の覚え書き）"
            rows={3}
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />
          <div className="task-add-row">
            <button className="task-save-btn" onClick={add} disabled={!text.trim() || saving}>
              {saving ? '...' : '保存'}
            </button>
            <button className="task-cancel-btn" onClick={() => setAdding(false)}>×</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="task-loading">読み込み中...</div>
      ) : memos.length === 0 && !adding ? (
        <div className="task-empty">メモはありません</div>
      ) : (
        <div className="memo-items">
          {memos.map(m => (
            <div key={m.id} className="memo-item">
              <div className="memo-text">{m.name}</div>
              <div className="memo-foot">
                <span className="memo-date">{m.created_at?.slice(0, 10).replace(/-/g, '/')}</span>
                <button className="task-delete" onClick={() => remove(m.id)} aria-label="削除"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

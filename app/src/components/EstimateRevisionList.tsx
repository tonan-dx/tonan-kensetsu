import { useEffect, useState } from 'react'
import { ExternalLink, Plus, Trash2, FileText } from 'lucide-react'
import type { EstimateRevision } from '../types'

interface Props {
  estimateId: string
}

export default function EstimateRevisionList({ estimateId }: Props) {
  const [revisions, setRevisions] = useState<EstimateRevision[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    version_name: '',
    drive_url: '',
    registered_date: new Date().toISOString().slice(0, 10),
    memo: '',
  })

  useEffect(() => {
    fetch(`/api/estimate-revisions?estimate_id=${estimateId}`)
      .then(r => r.json())
      .then(data => { setRevisions(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [estimateId])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/estimate-revisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estimate_id: estimateId, ...form }),
    })
    const newRevision = await res.json()
    setRevisions(prev => [newRevision, ...prev])
    setForm({ version_name: '', drive_url: '', registered_date: new Date().toISOString().slice(0, 10), memo: '' })
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await fetch(`/api/estimate-revisions/${id}`, { method: 'DELETE' })
    setRevisions(prev => prev.filter(r => r.id !== id))
  }

  if (loading) return (
    <div className="detail-section">
      <p className="detail-label" style={{ margin: 0 }}>
        <FileText size={14} style={{ display: 'inline', marginRight: 4 }} />
        見積書リビジョン
      </p>
    </div>
  )

  return (
    <div className="detail-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p className="detail-label" style={{ margin: 0 }}>
          <FileText size={14} style={{ display: 'inline', marginRight: 4 }} />
          見積書リビジョン
        </p>
        <button
          className="btn-primary"
          style={{ fontSize: 12, padding: '4px 10px' }}
          onClick={() => setShowForm(v => !v)}
        >
          <Plus size={13} /> 版を追加
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: '0 0 100px' }}>
              <label className="form-label" style={{ fontSize: 11 }}>版名 *</label>
              <select
                className="form-select"
                style={{ fontSize: 13 }}
                required
                value={form.version_name}
                onChange={e => setForm(f => ({ ...f, version_name: e.target.value }))}
              >
                <option value="">選択</option>
                <option value="第1版">第1版</option>
                <option value="第2版">第2版</option>
                <option value="第3版">第3版</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ fontSize: 11 }}>登録日</label>
              <input
                type="date"
                className="form-input"
                style={{ fontSize: 13 }}
                value={form.registered_date}
                onChange={e => setForm(f => ({ ...f, registered_date: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: 11 }}>Google Drive URL *</label>
            <input
              className="form-input"
              style={{ fontSize: 13 }}
              required
              type="url"
              placeholder="https://docs.google.com/..."
              value={form.drive_url}
              onChange={e => setForm(f => ({ ...f, drive_url: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: 11 }}>メモ</label>
            <input
              className="form-input"
              style={{ fontSize: 13 }}
              placeholder="変更点など"
              value={form.memo}
              onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => setShowForm(false)}>キャンセル</button>
            <button type="submit" className="btn-primary" style={{ fontSize: 12 }} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
          </div>
        </form>
      )}

      {revisions.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: 13 }}>見積書がまだ登録されていません</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {revisions.map((rev, i) => (
            <div key={rev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: i < revisions.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{rev.version_name}</span>
                  {i === 0 && (
                    <span style={{ fontSize: 10, background: '#3b82f620', color: '#3b82f6', padding: '1px 6px', borderRadius: 4 }}>最新</span>
                  )}
                  {rev.registered_date && (
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{rev.registered_date}</span>
                  )}
                </div>
                {rev.memo && (
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0', whiteSpace: 'pre-wrap' }}>{rev.memo}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {rev.drive_url && (
                  <a href={rev.drive_url} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Google Driveで開く">
                    <ExternalLink size={15} />
                  </a>
                )}
                <button className="btn-icon danger" onClick={() => handleDelete(rev.id, rev.version_name)} title="削除">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Send, Paperclip, X, Loader, Check, CheckCircle2 } from 'lucide-react'
import type { Contact, ContactReply, Attachment } from '../types'
import { AttachmentView, toDataUrl } from '../components/AttachmentBox'

const MEMBERS = ['長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '山崎', '幹子', '佐野', '上野', '岩洞', '小笠原']

function timeLabel(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${mi}`
}

export default function ContactThread() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)

  const [author, setAuthor] = useState('')
  const [text, setText] = useState('')
  const [pending, setPending] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const load = () => {
    fetch(`/api/contacts/${id}`).then(r => r.json()).then(data => {
      setContact(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [contact?.replies?.length])

  const remove = async () => {
    if (!confirm('この報連相を削除しますか？')) return
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    navigate('/contacts')
  }

  const toggleConfirm = async () => {
    if (!contact) return
    const updated = await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: !contact.confirmed }),
    }).then(r => r.json()).catch(() => null)
    if (updated) setContact(updated)
  }

  const send = async () => {
    if (sending) return
    if (!text.trim() && pending.length === 0) return
    setSending(true)
    try {
      // 添付を先にアップロード
      const attachments: Attachment[] = []
      for (const file of pending) {
        const { data, contentType } = await toDataUrl(file)
        const result = await fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, data, ref_id: id, ref_type: 'contact-msg', content_type: contentType }),
        }).then(r => r.json())
        if (result.url) attachments.push(result)
        else if (result.error) { alert(result.error) }
      }
      const reply: ContactReply = await fetch(`/api/contacts/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, content: text.trim(), attachments }),
      }).then(r => r.json())
      if (reply && reply.id) {
        setContact(prev => prev ? { ...prev, replies: [...(prev.replies ?? []), reply] } : prev)
        setText('')
        setPending([])
        if (fileRef.current) fileRef.current.value = ''
      }
    } catch (e) {
      console.error(e)
      alert('送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  const addPending = (files: FileList | null) => {
    if (!files) return
    setPending(prev => [...prev, ...Array.from(files)].slice(0, 10))
    if (fileRef.current) fileRef.current.value = ''
  }

  if (loading) return <div className="loading">読み込み中...</div>
  if (!contact) return <div className="loading">報連相が見つかりません</div>

  const replies = contact.replies ?? []

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button className="btn-back" onClick={() => navigate('/contacts')}><ArrowLeft size={20} /></button>
        <div className="chat-header-main">
          <div className="chat-header-title">{contact.subject}</div>
          <div className="chat-header-sub">
            {contact.recipients.length > 0 ? `宛先: ${contact.recipients.join('、')}` : '宛先なし'}
            {contact.office && ` ・ ${contact.office}`}
          </div>
        </div>
        <button
          className={`chat-confirm${contact.confirmed ? ' done' : ''}`}
          onClick={toggleConfirm}
          title={contact.confirmed ? '確認済み（戻す）' : '確認済みにする'}
        >
          {contact.confirmed ? <CheckCircle2 size={16} /> : <Check size={16} />}
        </button>
        <Link to={`/contacts/${id}/edit`} className="btn-icon"><Pencil size={17} /></Link>
        <button className="btn-icon danger" onClick={remove}><Trash2 size={17} /></button>
      </div>

      <div className="chat-body">
        {/* 元の投稿（会話の先頭） */}
        <div className="chat-msg">
          <div className="chat-msg-meta">
            <span className="chat-msg-author">{contact.poster || '投稿'}</span>
            {contact.date && <span className="chat-msg-time">{contact.date}</span>}
          </div>
          <div className="chat-bubble chat-bubble-origin">
            {contact.content ? contact.content : <span className="chat-empty">（本文なし）</span>}
          </div>
        </div>

        {/* 返信 */}
        {replies.map(r => (
          <div key={r.id} className="chat-msg">
            <div className="chat-msg-meta">
              <span className="chat-msg-author">{r.author || '匿名'}</span>
              <span className="chat-msg-time">{timeLabel(r.at)}</span>
            </div>
            {r.content && <div className="chat-bubble">{r.content}</div>}
            {r.attachments?.length > 0 && (
              <div className="chat-attach">
                {r.attachments.map(a => <AttachmentView key={a.url} a={a} onView={u => window.open(u, '_blank')} />)}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* 返信入力 */}
      <div className="chat-composer">
        {pending.length > 0 && (
          <div className="chat-pending">
            {pending.map((f, i) => (
              <span key={i} className="chat-pending-chip">
                {f.name}
                <button onClick={() => setPending(prev => prev.filter((_, j) => j !== i))}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
        <div className="chat-composer-row">
          <select className="chat-author-select" value={author} onChange={e => setAuthor(e.target.value)}>
            <option value="">名前</option>
            {MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="chat-attach-btn" onClick={() => fileRef.current?.click()} title="画像・ファイルを添付">
            <Paperclip size={18} />
          </button>
          <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => addPending(e.target.files)} />
          <textarea
            className="chat-input"
            placeholder="メッセージを入力"
            value={text}
            rows={1}
            onChange={e => setText(e.target.value)}
          />
          <button className="chat-send" onClick={send} disabled={sending || (!text.trim() && pending.length === 0)}>
            {sending ? <Loader size={18} className="spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}

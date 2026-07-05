import { useState, useEffect, useRef } from 'react'
import { Paperclip, Trash2, Plus, Loader, X, FileText } from 'lucide-react'
import type { Attachment } from '../types'

const MAX_FILES = 20
const MAX_PX = 1600

interface Props {
  refId: string
  refType: string
  label?: string
}

// 画像は縮小してjpeg化、その他ファイルはそのままdataURL化して送る
export function toDataUrl(file: File): Promise<{ data: string; contentType: string }> {
  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        let { width, height } = img
        if (width > MAX_PX || height > MAX_PX) {
          const r = Math.min(MAX_PX / width, MAX_PX / height)
          width = Math.round(width * r)
          height = Math.round(height * r)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(objectUrl)
        resolve({ data: canvas.toDataURL('image/jpeg', 0.82), contentType: 'image/jpeg' })
      }
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('load failed')) }
      img.src = objectUrl
    })
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ data: String(reader.result), contentType: file.type || 'application/octet-stream' })
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

export function isImage(a: Attachment): boolean {
  return (a.content_type ?? '').startsWith('image/') || /\.(jpe?g|png|gif|webp|heic|bmp|svg)$/i.test(a.filename)
}

export default function AttachmentBox({ refId, refType, label = '添付ファイル' }: Props) {
  const [items, setItems] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewImg, setViewImg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/photos?ref_id=${encodeURIComponent(refId)}&ref_type=${refType}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [refId, refType])

  const handleFiles = async (files: FileList | null) => {
    if (!files || uploading) return
    const toUpload = Array.from(files).slice(0, MAX_FILES - items.length)
    if (!toUpload.length) return
    setUploading(true)
    for (const file of toUpload) {
      try {
        const { data, contentType } = await toDataUrl(file)
        const result = await fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, data, ref_id: refId, ref_type: refType, content_type: contentType }),
        }).then(r => r.json())
        if (result.url) setItems(prev => [...prev, result])
        else if (result.error) alert(result.error)
      } catch (e) { console.error('upload failed', e) }
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const remove = async (a: Attachment) => {
    if (!confirm('この添付を削除しますか？')) return
    await fetch(`/api/photos?url=${encodeURIComponent(a.url)}`, { method: 'DELETE' }).catch(() => {})
    setItems(prev => prev.filter(x => x.url !== a.url))
  }

  return (
    <div className="attach-box">
      <div className="attach-box-head">
        <div className="attach-box-title">
          <Paperclip size={16} />
          {label}
          {!loading && <span className="attach-box-count">{items.length}/{MAX_FILES}</span>}
        </div>
        {items.length < MAX_FILES && (
          <button className="attach-box-add" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader size={14} className="spin" /> : <Plus size={14} />}
            {uploading ? 'アップロード中' : '追加'}
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />

      {loading ? (
        <p className="attach-box-loading">読み込み中...</p>
      ) : items.length === 0 && !uploading ? (
        <button className="attach-empty-btn" onClick={() => inputRef.current?.click()}>
          <Paperclip size={20} />
          <span>画像・ファイルを追加</span>
        </button>
      ) : (
        <div className="attach-list">
          {items.map(a => (
            <AttachmentView key={a.url} a={a} onView={setViewImg} onRemove={() => remove(a)} />
          ))}
          {uploading && <div className="attach-chip uploading"><Loader size={16} className="spin" /></div>}
        </div>
      )}

      {viewImg && (
        <div className="photo-lightbox" onClick={() => setViewImg(null)}>
          <button className="photo-lightbox-close" onClick={() => setViewImg(null)}><X size={24} /></button>
          <img src={viewImg} alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}

// 単一添付の表示（画像はサムネ、ファイルはチップ）。削除ボタンは任意。
export function AttachmentView({ a, onView, onRemove }: { a: Attachment; onView?: (url: string) => void; onRemove?: () => void }) {
  if (isImage(a)) {
    return (
      <div className="attach-thumb">
        <img src={a.url} alt={a.filename} loading="lazy" onClick={() => onView?.(a.url)} />
        {onRemove && <button className="attach-thumb-del" onClick={onRemove}><Trash2 size={12} /></button>}
      </div>
    )
  }
  return (
    <div className="attach-chip">
      <a href={a.url} target="_blank" rel="noreferrer" className="attach-chip-link">
        <FileText size={16} />
        <span className="attach-chip-name">{a.filename}</span>
      </a>
      {onRemove && <button className="attach-chip-del" onClick={onRemove}><Trash2 size={12} /></button>}
    </div>
  )
}

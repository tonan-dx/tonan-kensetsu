import { useState, useEffect, useRef } from 'react'
import { Camera, Trash2, Plus, Loader, X } from 'lucide-react'

const MAX_PHOTOS = 10
const MAX_PX = 1600

interface Photo {
  url: string
  filename: string
  uploaded_at: string
}

interface Props {
  refId: string
  refType: 'project' | 'estimate' | 'safety' | 'report'
}

export default function PhotoUpload({ refId, refType }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewImg, setViewImg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/photos?ref_id=${encodeURIComponent(refId)}&ref_type=${refType}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setPhotos(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [refId, refType])

  const compress = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
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
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('load failed')) }
      img.src = objectUrl
    })

  const handleFiles = async (files: FileList | null) => {
    if (!files || uploading) return
    const toUpload = Array.from(files).slice(0, MAX_PHOTOS - photos.length)
    if (!toUpload.length) return
    setUploading(true)
    for (const file of toUpload) {
      try {
        const data = await compress(file)
        const result = await fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, data, ref_id: refId, ref_type: refType }),
        }).then(r => r.json())
        if (result.url) setPhotos(prev => [...prev, result])
      } catch (e) { console.error('upload failed', e) }
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const remove = async (photo: Photo) => {
    if (!confirm('この写真を削除しますか？')) return
    await fetch(`/api/photos?url=${encodeURIComponent(photo.url)}`, { method: 'DELETE' }).catch(() => {})
    setPhotos(prev => prev.filter(p => p.url !== photo.url))
  }

  return (
    <div className="photo-section">
      <div className="photo-section-header">
        <div className="photo-section-title">
          <Camera size={16} />
          写真
          {!loading && <span className="photo-section-count">{photos.length}/{MAX_PHOTOS}</span>}
        </div>
        {photos.length < MAX_PHOTOS && (
          <button
            className="photo-section-add"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader size={14} className="spin" /> : <Plus size={14} />}
            {uploading ? 'アップロード中' : '追加'}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />

      {loading ? (
        <p className="photo-section-loading">読み込み中...</p>
      ) : photos.length === 0 && !uploading ? (
        <button className="photo-empty-btn" onClick={() => inputRef.current?.click()}>
          <Camera size={22} />
          <span>写真を追加する</span>
        </button>
      ) : (
        <div className="photo-section-grid">
          {photos.map(p => (
            <div key={p.url} className="photo-section-thumb">
              <img src={p.url} alt="" loading="lazy" onClick={() => setViewImg(p.url)} />
              <button className="photo-section-del" onClick={() => remove(p)}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {uploading && (
            <div className="photo-section-thumb uploading">
              <Loader size={20} className="spin" />
            </div>
          )}
        </div>
      )}

      {viewImg && (
        <div className="photo-lightbox" onClick={() => setViewImg(null)}>
          <button className="photo-lightbox-close" onClick={() => setViewImg(null)}>
            <X size={24} />
          </button>
          <img src={viewImg} alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}

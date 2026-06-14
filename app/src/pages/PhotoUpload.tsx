import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Upload } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Project } from '../types'

export default function PhotoUpload() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedProject = searchParams.get('project_id') ?? ''

  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState(preselectedProject)
  const [caption, setCaption] = useState('')
  const [takenAt, setTakenAt] = useState(new Date().toISOString().slice(0, 10))
  const [files, setFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string[]>([])

  useEffect(() => {
    supabase.from('projects').select('id, name').order('name')
      .then(({ data }) => { if (data) setProjects(data as Project[]) })
  }, [])

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files
    setFiles(f)
    if (!f) return
    const urls = Array.from(f).map(file => URL.createObjectURL(file))
    setPreview(urls)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!files || !projectId) return
    setUploading(true)

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('construction-photos')
        .upload(path, file)
      if (uploadError) continue
      await supabase.from('photos').insert({
        project_id: projectId,
        file_path: path,
        file_name: file.name,
        caption: caption || null,
        taken_at: takenAt || null,
      })
    }

    setUploading(false)
    navigate(preselectedProject ? `/projects/${preselectedProject}` : '/photos')
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="page-title">写真をアップロード</h1>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label className="form-label">案件 *</label>
          <select className="form-select" required value={projectId}
            onChange={e => setProjectId(e.target.value)}>
            <option value="">選択してください</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">撮影日</label>
          <input type="date" className="form-input" value={takenAt}
            onChange={e => setTakenAt(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">説明</label>
          <input className="form-input" placeholder="写真の説明" value={caption}
            onChange={e => setCaption(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">写真を選択 *</label>
          <label className="upload-area">
            <Upload size={32} />
            <span>タップして写真を選択</span>
            <input type="file" accept="image/*" multiple required onChange={handleFiles}
              className="file-input" />
          </label>
        </div>

        {preview.length > 0 && (
          <div className="preview-grid">
            {preview.map((url, i) => (
              <img key={i} src={url} alt="" className="preview-img" />
            ))}
          </div>
        )}

        <button type="submit" className="btn-submit" disabled={uploading || !files}>
          {uploading ? `アップロード中...` : `アップロード (${files?.length ?? 0}枚)`}
        </button>
      </form>
    </div>
  )
}

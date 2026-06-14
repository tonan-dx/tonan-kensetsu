import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Photo, Project } from '../types'

export default function Photos() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('photos').select('*, project:projects(name)').order('created_at', { ascending: false }),
      supabase.from('projects').select('id, name').order('name'),
    ]).then(([{ data: ph }, { data: pj }]) => {
      if (ph) {
        const withUrls = ph.map(p => ({
          ...p,
          url: supabase.storage.from('construction-photos').getPublicUrl(p.file_path).data.publicUrl,
        }))
        setPhotos(withUrls)
      }
      if (pj) setProjects(pj as Project[])
      setLoading(false)
    })
  }, [])

  const filtered = filterProject
    ? photos.filter(p => p.project_id === filterProject)
    : photos

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">写真・書類</h1>
        <Link to="/photos/upload" className="btn-primary">
          <Plus size={18} /> 追加
        </Link>
      </div>

      <div className="filter-row">
        <Search size={16} className="search-icon" />
        <select className="form-select" value={filterProject}
          onChange={e => setFilterProject(e.target.value)}>
          <option value="">すべての案件</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading ? <div className="loading">読み込み中...</div> : (
        filtered.length === 0 ? (
          <p className="empty-text">写真がありません</p>
        ) : (
          <div className="photo-grid-full">
            {filtered.map(p => (
              <div key={p.id} className="photo-card">
                <img src={p.url} alt={p.caption ?? ''} className="photo-img" />
                <div className="photo-info">
                  <p className="photo-project">{p.project?.name}</p>
                  {p.caption && <p className="photo-caption">{p.caption}</p>}
                  <p className="photo-date">{p.taken_at ?? p.created_at.slice(0, 10)}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { CheckSquare, Square, Trash2, Plus, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import type { Task } from '../types'
import { useOfficeFilter } from '../lib/office'

const MEMBERS = ['長澤', '坂井', '高橋', '五十嵐', '堀合', '櫻川', '竹田', '千葉', '水間', '晴山', '山崎', '幹子', '佐野', '上野', '岩洞', '小笠原']

interface Props {
  refId: string
  refType: 'project' | 'estimate' | 'safety'
}

export default function TaskList({ refId, refType }: Props) {
  const { loc } = useOfficeFilter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAssignee, setNewAssignee] = useState('')
  const [newDue, setNewDue] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDone, setShowDone] = useState(false)

  useEffect(() => {
    fetch(`/api/checklist?ref_id=${encodeURIComponent(refId)}&ref_type=${refType}`)
      .then(r => r.json())
      .then(data => { setTasks(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [refId, refType])

  const toggleDone = async (task: Task) => {
    const updated = await fetch(`/api/checklist/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !task.done }),
    }).then(r => r.json()).catch(() => null)
    if (updated) setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
  }

  const updateTask = async (task: Task, fields: Partial<Pick<Task, 'name' | 'assignee' | 'due_date'>>) => {
    const updated = await fetch(`/api/checklist/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    }).then(r => r.json()).catch(() => null)
    if (updated) setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
  }

  const deleteTask = async (task: Task) => {
    await fetch(`/api/checklist/${task.id}`, { method: 'DELETE' })
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  const addTask = async () => {
    if (!newName.trim() || saving) return
    setSaving(true)
    const created = await fetch('/api/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        assignee: newAssignee || null,
        due_date: newDue || null,
        ref_id: refId,
        ref_type: refType,
        office: loc === 'all' ? null : loc,
      }),
    }).then(r => r.json()).catch(() => null)
    if (created) setTasks(prev => [...prev, created])
    setNewName('')
    setNewAssignee('')
    setNewDue('')
    setAdding(false)
    setSaving(false)
  }

  const pending = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)

  return (
    <div className="task-list-section">
      <div className="task-list-header">
        <div className="task-list-title">
          <CheckSquare size={16} />
          タスク
          <span className="task-count">{pending.length}件未完了</span>
        </div>
        <button className="task-add-btn" onClick={() => setAdding(a => !a)}>
          <Plus size={16} /> 追加
        </button>
      </div>

      {adding && (
        <div className="task-add-form">
          <input
            className="task-input"
            placeholder="タスク名を入力..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            autoFocus
          />
          <div className="task-add-row">
            <select
              className="task-select"
              value={newAssignee}
              onChange={e => setNewAssignee(e.target.value)}
            >
              <option value="">担当者</option>
              {MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input
              type="date"
              className="task-date"
              value={newDue}
              onChange={e => setNewDue(e.target.value)}
            />
            <button
              className="task-save-btn"
              onClick={addTask}
              disabled={!newName.trim() || saving}
            >
              {saving ? '...' : '保存'}
            </button>
            <button className="task-cancel-btn" onClick={() => setAdding(false)}>×</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="task-loading">読み込み中...</div>
      ) : (
        <>
          {pending.length === 0 && done.length === 0 && !adding && (
            <div className="task-empty">タスクはありません</div>
          )}

          <div className="task-items">
            {pending.map(task => (
              <TaskItem key={task.id} task={task} onToggle={toggleDone} onDelete={deleteTask} onUpdate={updateTask} />
            ))}
          </div>

          {done.length > 0 && (
            <div className="task-done-section">
              <button
                className="task-done-toggle"
                onClick={() => setShowDone(s => !s)}
              >
                {showDone ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                完了済み {done.length}件
              </button>
              {showDone && (
                <div className="task-items done">
                  {done.map(task => (
                    <TaskItem key={task.id} task={task} onToggle={toggleDone} onDelete={deleteTask} onUpdate={updateTask} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TaskItem({ task, onToggle, onDelete, onUpdate }: {
  task: Task
  onToggle: (t: Task) => void
  onDelete: (t: Task) => void
  onUpdate: (t: Task, fields: Partial<Pick<Task, 'name' | 'assignee' | 'due_date'>>) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(task.name)
  const [editAssignee, setEditAssignee] = useState(task.assignee ?? '')
  const [editDue, setEditDue] = useState(task.due_date ?? '')
  const [saving, setSaving] = useState(false)

  const isOverdue = !task.done && task.due_date && task.due_date < new Date().toISOString().slice(0, 10)

  const handleSave = async () => {
    if (!editName.trim()) return
    setSaving(true)
    await onUpdate(task, {
      name: editName.trim(),
      assignee: editAssignee || null,
      due_date: editDue || null,
    } as any)
    setSaving(false)
    setEditing(false)
  }

  const handleCancel = () => {
    setEditName(task.name)
    setEditAssignee(task.assignee ?? '')
    setEditDue(task.due_date ?? '')
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="task-item editing">
        <input
          className="task-input"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          autoFocus
        />
        <div className="task-add-row">
          <select
            className="task-select"
            value={editAssignee}
            onChange={e => setEditAssignee(e.target.value)}
          >
            <option value="">担当者</option>
            {MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            type="date"
            className="task-date"
            value={editDue}
            onChange={e => setEditDue(e.target.value)}
          />
          <button className="task-save-btn" onClick={handleSave} disabled={!editName.trim() || saving}>
            {saving ? '...' : '保存'}
          </button>
          <button className="task-cancel-btn" onClick={handleCancel}>×</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`task-item${task.done ? ' done' : ''}`}>
      <button className="task-check" onClick={() => onToggle(task)}>
        {task.done ? <CheckSquare size={18} color="#16a34a" /> : <Square size={18} color="#94a3b8" />}
      </button>
      <div className="task-info" onClick={() => setEditing(true)} style={{ cursor: 'pointer', flex: 1 }}>
        <span className="task-name">{task.name}</span>
        <div className="task-meta">
          {task.assignee && <span className="task-assignee">{task.assignee}</span>}
          {task.due_date && (
            <span className={`task-due${isOverdue ? ' overdue' : ''}`}>
              {task.due_date}
            </span>
          )}
        </div>
      </div>
      <button className="task-edit" onClick={() => setEditing(true)} title="編集">
        <Pencil size={13} />
      </button>
      <button className="task-delete" onClick={() => onDelete(task)}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

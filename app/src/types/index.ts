export interface Notice {
  id: string
  title: string
  content: string | null
  date: string | null
  poster: string | null
  confirmed_by: string[]
  created_at: string
}

export type ProjectStatus = '着工前' | '進行中' | '確認待ち' | '完了' | '請求' | '入金済み'
export type ProcessStatus = '未着手' | '準備中' | '作業中' | '確認待ち' | '遅延' | '完了' | '中止'
export type EstimateStatus = '見積書作成前' | '見積書作成中' | '社長チェック' | 'お客様へ提出' | '着工決定' | 'ボツ／失注'
export type PresidentCheckStatus = '未依頼' | '依頼済' | '確認中' | '確認済'
export type EstimateResult = '未確定' | '着工決定' | '失注'
export type WorkType = '新築' | 'リフォーム・改修' | '修繕' | '解体' | '土木・外構' | 'その他'
export type ProjectCategory = '管工事' | '土木工事' | '水道施設' | '舗装' | 'とび・土工'
export type Assignee = '長澤' | '坂井' | '高橋' | '五十嵐' | '堀合' | '櫻川' | '竹田' | '千葉' | '水間' | '晴山' | '山崎' | '幹子' | '佐野' | '上野' | '岩洞' | '小笠原'
export type Weather = '晴れ' | 'くもり' | '雨' | '雪'
export type CheckStatus = '未確認' | '確認中' | '差し戻し' | '確認済み'

export interface Project {
  id: string
  name: string
  client_name: string
  location: string
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
  contract_amount: number | null
  assignee: string | null
  type: string | null
  category: string | null
  contract_date: string | null
  created_at: string
}

export interface Estimate {
  id: string
  title: string
  customer_name: string | null
  address: string | null
  assignee: string | null
  estimate_deadline: string | null
  estimate_amount: number | null
  cost_estimate: number | null
  gross_profit: number | null
  status: EstimateStatus | null
  president_check: PresidentCheckStatus | null
  result: EstimateResult | null
  submission_date: string | null
  decision_date: string | null
  rejection_reason: string | null
  request_content: string | null
  notes: string | null
  related_project_id: string | null
  created_at: string
}

export interface SafetyRecord {
  id: string
  title: string
  date: string | null
  project_id: string | null
  project: { id: string; name: string } | null
  ky_activity: string | null
  near_miss: string | null
  safety_log: string | null
  hazard: string | null
  corrective_action: string | null
  recorder: string | null
  reviewer: string | null
  confirmed: boolean
  confirmed_by: string[]
  created_at: string
}

export interface Task {
  id: string
  name: string
  assignee: string | null
  done: boolean
  due_date: string | null
  notes: string | null
  ref_id: string | null
  ref_type: 'project' | 'estimate' | 'safety' | null
  created_at: string
}

export interface Process {
  id: string
  name: string
  planned_start: string | null
  planned_end: string | null
  actual_start: string | null
  actual_end: string | null
  status: ProcessStatus | null
  assignee: string | null
  done: boolean
  related_project_id: string | null
  created_at: string
}

export interface EstimateRevision {
  id: string
  version_name: string
  estimate_id: string | null
  drive_url: string | null
  registered_date: string | null
  memo: string | null
  created_at: string
}

export interface DailyReport {
  id: string
  title: string
  project_id: string | null
  project: { id: string; name: string } | null
  report_date: string | null
  weather: string | null
  workers_count: number | null
  work_content: string
  tomorrow: string | null
  notes: string | null
  trouble: boolean
  check_status: CheckStatus
  assignee: string | null
  created_at: string
}

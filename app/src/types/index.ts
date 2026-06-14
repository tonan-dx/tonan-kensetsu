export type ProjectStatus = '着工前' | '進行中' | '確認待ち' | '完了' | '請求待ち' | '入金済み'
export type EstimateStatus = '見積書作成前' | '見積書作成中' | '社長チェック' | 'お客様へ提出' | '着工決定' | 'ボツ／失注'
export type PresidentCheckStatus = '未依頼' | '依頼済' | '確認中' | '確認済'
export type EstimateResult = '未確定' | '着工決定' | '失注'
export type WorkType = '新築' | 'リフォーム・改修' | '修繕' | '解体' | '土木・外構' | 'その他'
export type Assignee = '長澤' | '坂井' | '高橋' | '五十嵐' | '堀合' | '櫻川' | '竹田' | '千葉' | '水間' | '晴山' | '佐野'
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
  created_at: string
  notion_url: string
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
  notion_url: string
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
  notion_url: string
}

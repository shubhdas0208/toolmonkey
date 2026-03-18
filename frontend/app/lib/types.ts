export type FailureMode = "none" | "timeout" | "wrong_answer" | "malformed_json" | "silent_failure"

export interface LogStep {
  step: string
  content?: string
  tool?: string
  reasoning?: string
  response?: Record<string, unknown>
  answer?: string
  type?: string
  attempt?: number
  failure_mode?: string
}

export interface Scores {
  scenario_id: string
  failure_mode: string
  task_completion: number
  failure_detection: number
  retry_efficiency: number
  silent_failure: number
  final_answer: string
  failure_detected: boolean
  retries: number
}

export interface SimulationResult {
  task: string
  failure_mode: string
  final_answer: string
  failure_detected: boolean
  silent_failure: boolean
  retries: number
  log: LogStep[]
  scenario_id: string
  correct_answer: string | null
  scores: Scores
}

export interface Scenario {
  id: string
  task: string
  tool: string
  correct_answer: string
}
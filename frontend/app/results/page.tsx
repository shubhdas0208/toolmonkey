"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SimulationResult } from "../lib/types"
import { Suspense } from "react"

function ResultsScreen() {
  const router = useRouter()
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem("toolmonkey_result")
    if (!stored) { router.push("/"); return }
    setResult(JSON.parse(stored))
  }, [])

  if (!result) return (
    <div className="min-h-screen bg-gray-950 text-white p-8 flex items-center justify-center">
      <p className="text-gray-500">Loading results...</p>
    </div>
  )

  const scores = result.scores
  const health = getHealth(scores)

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐒</span>
            <h1 className="text-2xl font-bold">Results</h1>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            ← Run another
          </button>
        </div>

        {/* Health Score */}
        <div className={`rounded-xl border p-6 mb-6 ${health.bg}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-400">Aggregate health score</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${health.badge}`}>{health.label}</span>
          </div>
          <div className={`text-5xl font-bold mb-1 ${health.color}`}>
            {getHealthScore(scores)} <span className="text-2xl text-gray-500">/ 100</span>
          </div>
          <p className="text-xs text-gray-500">
            Scenario: {result.scenario_id} · Failure mode: {result.failure_mode}
          </p>
        </div>

        {/* 4 Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <MetricCard
            label="Task Completion"
            value={scores.task_completion === 1 ? "100%" : "0%"}
            description="Did the agent produce a usable answer?"
            good={scores.task_completion === 1}
          />
          <MetricCard
            label="Failure Detection"
            value={scores.failure_detection === -1 ? "N/A" : scores.failure_detection === 1 ? "Detected" : "Missed"}
            description="Did the agent notice the tool failed?"
            good={scores.failure_detection !== 0}
            neutral={scores.failure_detection === -1}
          />
          <MetricCard
            label="Retry Efficiency"
            value={scores.retry_efficiency === -1 ? "N/A" : scores.retry_efficiency === 1 ? "Recovered" : "Failed"}
            description="When retried, did it recover?"
            good={scores.retry_efficiency !== 0}
            neutral={scores.retry_efficiency === -1}
          />
          <MetricCard
            label="Silent Failure"
            value={scores.silent_failure === 0 ? "Clean" : "SILENT FAIL"}
            description="Confident answer on bad data? Lower is better."
            good={scores.silent_failure === 0}
            invert={true}
          />
        </div>

        {/* Final Answer */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-4">
          <p className="text-xs text-gray-500 mb-2">Final answer</p>
          <p className="text-sm text-gray-200">{result.final_answer}</p>
          {result.correct_answer && (
            <p className="text-xs text-gray-600 mt-2">
              Correct answer: <span className="text-gray-400">{result.correct_answer}</span>
            </p>
          )}
        </div>

        {/* Reasoning Log */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-6">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <span>Reasoning log ({result.log.length} steps)</span>
            <span>{expanded ? "▲" : "▼"}</span>
          </button>
          {expanded && (
            <div className="border-t border-gray-800 p-4 font-mono text-xs space-y-2 max-h-64 overflow-y-auto">
              {result.log.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-gray-600 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-gray-400">{step.step}:</span>
                  <span className="text-gray-300 break-all">
                    {step.content || step.answer || step.reasoning || JSON.stringify(step.response) || step.type || ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Download */}
        <button
          onClick={() => downloadReport(result)}
          className="w-full border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 py-2.5 rounded-lg text-sm transition-all"
        >
          Download report as JSON
        </button>

      </div>
    </main>
  )
}

function MetricCard({ label, value, description, good, neutral, invert }: {
  label: string
  value: string
  description: string
  good: boolean
  neutral?: boolean
  invert?: boolean
}) {
  const color = neutral ? "text-gray-400" : good ? "text-green-400" : "text-red-400"
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold mb-1 ${color}`}>{value}</p>
      <p className="text-xs text-gray-600">{description}</p>
    </div>
  )
}

function getHealthScore(scores: SimulationResult["scores"]): number {
  const completion = scores.task_completion * 40
  const detection = scores.failure_detection === -1 ? 30 : scores.failure_detection * 30
  const silent = (1 - scores.silent_failure) * 30
  return Math.round(completion + detection + silent)
}

function getHealth(scores: SimulationResult["scores"]) {
  const score = getHealthScore(scores)
  if (score >= 70) return {
    color: "text-green-400",
    bg: "bg-green-950 border border-green-900",
    badge: "bg-green-900 border-green-700 text-green-300",
    label: "Healthy"
  }
  if (score >= 40) return {
    color: "text-yellow-400",
    bg: "bg-yellow-950 border border-yellow-900",
    badge: "bg-yellow-900 border-yellow-700 text-yellow-300",
    label: "Degraded"
  }
  return {
    color: "text-red-400",
    bg: "bg-red-950 border border-red-900",
    badge: "bg-red-900 border-red-700 text-red-300",
    label: "Critical"
  }
}

function downloadReport(result: SimulationResult) {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `toolmonkey_${result.scenario_id}_${result.failure_mode}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-white p-8">Loading...</div>}>
      <ResultsScreen />
    </Suspense>
  )
}
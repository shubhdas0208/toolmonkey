"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LogStep, SimulationResult } from "../lib/types"
import { Suspense } from "react"

function RunningScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [steps, setSteps] = useState<LogStep[]>([])
  const [done, setDone] = useState(false)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const failureMode = searchParams.get("failure_mode") || "none"
  const mode = searchParams.get("mode") || "fixed"
  const scenarioId = searchParams.get("scenario_id") || ""
  const customTask = searchParams.get("custom_task") || ""

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const body = mode === "fixed"
      ? { scenario_id: scenarioId, failure_mode: failureMode }
      : { custom_task: customTask, failure_mode: failureMode }

    const ctrl = new AbortController()

    fetch(`${apiUrl}/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal
    }).then(async res => {
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.step === "simulation_complete") {
              setResult(parsed.result)
              setDone(true)
            } else {
              setSteps(prev => [...prev, parsed])
            }
          } catch {}
        }
      }
    }).catch(e => {
      if (e.name !== "AbortError") setError("Connection failed — is the backend running?")
    })

    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [steps])

  useEffect(() => {
    if (done && result) {
      // Store result and navigate
      sessionStorage.setItem("toolmonkey_result", JSON.stringify(result))
      setTimeout(() => router.push("/results"), 800)
    }
  }, [done, result])

  const getStepLabel = (step: LogStep) => {
    switch (step.step) {
      case "task_received": return `📋 Task received: ${step.content}`
      case "tool_selected": return `🔧 Tool selected: ${step.tool} — ${step.reasoning}`
      case "tool_response": return `📨 Tool response: ${JSON.stringify(step.response)}`
      case "failure_detected": return `⚠️ Failure detected: ${step.type}`
      case "retry_attempt": return `🔄 Retry attempt ${step.attempt}`
      case "retry_response": return `📨 Retry response: ${JSON.stringify(step.response)}`
      case "retry_succeeded": return `✅ Retry succeeded on attempt ${step.attempt}`
      case "max_retries_reached": return `❌ Max retries reached (${step.attempt})`
      case "silent_failure_warning": return `🔇 Silent failure warning: ${step.content}`
      case "completed_without_tool": return `✅ Completed without tool: ${step.answer}`
      case "final_answer": return `💬 Final answer: ${step.answer}`
      default: return `${step.step}`
    }
  }

  const failureColors: Record<string, string> = {
    none: "text-green-400",
    timeout: "text-yellow-400",
    wrong_answer: "text-orange-400",
    malformed_json: "text-red-400",
    silent_failure: "text-purple-400",
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🐒</span>
            <h1 className="text-2xl font-bold">Running Simulation</h1>
          </div>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Scenario: <span className="text-gray-300">{scenarioId || "custom"}</span></span>
            <span>Failure mode: <span className={failureColors[failureMode] || "text-gray-300"}>{failureMode}</span></span>
          </div>
        </div>

        {/* Log */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 font-mono text-sm space-y-3 min-h-48">
          {error && <p className="text-red-400">{error}</p>}
          {steps.length === 0 && !error && (
            <p className="text-gray-600">Connecting to agent...</p>
          )}
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-gray-600 text-xs mt-0.5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-gray-300 leading-relaxed break-all">{getStepLabel(step)}</span>
            </div>
          ))}
          {done && (
            <div className="text-green-400 font-medium pt-2 border-t border-gray-800">
              ✓ Simulation complete — loading results...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

      </div>
    </main>
  )
}

export default function RunningPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-white p-8">Loading...</div>}>
      <RunningScreen />
    </Suspense>
  )
}
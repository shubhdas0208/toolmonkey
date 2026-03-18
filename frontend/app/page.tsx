"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Scenario, FailureMode } from "./lib/types"

const FAILURE_MODES: { value: FailureMode; label: string; description: string; color: string }[] = [
  { value: "none", label: "No Failure", description: "Control run — normal behavior", color: "bg-green-100 border-green-300 text-green-800" },
  { value: "timeout", label: "Timeout", description: "Tool takes 15s to respond", color: "bg-yellow-100 border-yellow-300 text-yellow-800" },
  { value: "wrong_answer", label: "Wrong Answer", description: "Plausible but incorrect data", color: "bg-orange-100 border-orange-300 text-orange-800" },
  { value: "malformed_json", label: "Malformed JSON", description: "Broken or incomplete response", color: "bg-red-100 border-red-300 text-red-800" },
  { value: "silent_failure", label: "Silent Failure", description: "Empty string or null returned", color: "bg-purple-100 border-purple-300 text-purple-800" },
]

export default function SetupScreen() {
  const router = useRouter()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selectedScenario, setSelectedScenario] = useState<string>("C1")
  const [selectedFailure, setSelectedFailure] = useState<FailureMode>("none")
  const [customTask, setCustomTask] = useState("")
  const [mode, setMode] = useState<"fixed" | "custom">("fixed")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    fetch(`${apiUrl}/scenarios`)
      .then(r => r.json())
      .then(data => {
        setScenarios(data.scenarios)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleRun = () => {
    if (mode === "custom" && !customTask.trim()) return
    const params = new URLSearchParams({
      failure_mode: selectedFailure,
      mode,
      ...(mode === "fixed" ? { scenario_id: selectedScenario } : { custom_task: customTask.trim() })
    })
    router.push(`/running?${params.toString()}`)
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🐒</span>
            <h1 className="text-3xl font-bold tracking-tight">ToolMonkey</h1>
          </div>
          <p className="text-gray-400 text-sm">Chaos Monkey for LLM tool-calling agents. Inject failures. Measure reliability.</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode("fixed")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === "fixed" ? "bg-white text-gray-950" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            Fixed Scenario
          </button>
          <button
            onClick={() => setMode("custom")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === "custom" ? "bg-white text-gray-950" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            Custom Task
          </button>
        </div>

        {/* Scenario / Custom Input */}
        <div className="mb-6">
          {mode === "fixed" ? (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Select scenario</label>
              {loading ? (
                <div className="bg-gray-800 rounded-lg p-3 text-gray-500 text-sm">Loading scenarios...</div>
              ) : (
                <select
                  value={selectedScenario}
                  onChange={e => setSelectedScenario(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500"
                >
                  {scenarios.map(s => (
                    <option key={s.id} value={s.id}>{s.id} — {s.task}</option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Enter your task</label>
              <textarea
                value={customTask}
                onChange={e => setCustomTask(e.target.value)}
                placeholder="e.g. What is the weather in Tokyo right now?"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500 resize-none h-24"
              />
              <p className="text-xs text-gray-500 mt-1">Behavior scoring only — correctness not evaluated for custom tasks</p>
            </div>
          )}
        </div>

        {/* Failure Mode */}
        <div className="mb-8">
          <label className="block text-sm text-gray-400 mb-3">Failure mode</label>
          <div className="grid grid-cols-1 gap-2">
            {FAILURE_MODES.map(f => (
              <button
                key={f.value}
                onClick={() => setSelectedFailure(f.value)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all ${
                  selectedFailure === f.value
                    ? "border-white bg-gray-800"
                    : "border-gray-700 bg-gray-900 hover:border-gray-600"
                }`}
              >
                <div>
                  <span className="text-sm font-medium">{f.label}</span>
                  <span className="text-xs text-gray-500 ml-3">{f.description}</span>
                </div>
                {selectedFailure === f.value && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${f.color}`}>selected</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Run Button */}
        <button
          onClick={handleRun}
          disabled={mode === "custom" && !customTask.trim()}
          className="w-full bg-white text-gray-950 font-semibold py-3 rounded-lg hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Run Simulation →
        </button>

      </div>
    </main>
  )
}
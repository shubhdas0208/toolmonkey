"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ScoreResult {
  scenario_id: string;
  failure_mode: string;
  task_completion: number;
  failure_detection: number;
  retry_efficiency: number;
  silent_failure: number;
  final_answer: string | null;
  uncertainty_flagged: boolean;
  retry_attempted: boolean;
  contract_valid: boolean;
  contract_errors: string[];
}

interface CompareResult {
  scenario_id: string;
  failure_modes_tested: string[];
  model_a: { name: string; scores: any };
  model_b: { name: string; scores: any };
  delta: any;
  summary: string;
}

interface LogStep {
  step: string;
  [key: string]: any;
}

function getHealthColor(score: number) {
  if (score >= 70) return "text-green-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

function getScoreColor(value: number, inverted = false) {
  if (value === -1) return "text-gray-500";
  if (inverted) return value === 0 ? "text-green-400" : "text-red-400";
  return value === 1 ? "text-green-400" : "text-red-400";
}

function computeHealth(r: ScoreResult) {
  const completion = r.task_completion * 40;
  const detection = r.failure_detection === -1 ? 30 : r.failure_detection * 30;
  const silent = (1 - r.silent_failure) * 30;
  return Math.round(completion + detection + silent);
}

function MetricRow({ label, desc, value, inverted = false }: {
  label: string; desc: string; value: number; inverted?: boolean;
}) {
  const display = value === -1 ? "N/A" :
    inverted ? (value === 0 ? "CLEAN" : "SILENT FAIL") :
    label === "Task Completion" ? (value === 1 ? "PASS" : "FAIL") :
    label === "Failure Detection" ? (value === 1 ? "DETECTED" : "MISSED") :
    value === 1 ? "YES" : "NO";

  return (
    <div className="flex justify-between items-center p-3 bg-gray-900 border border-gray-700 rounded">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
      </div>
      <span className={`font-bold text-sm ${getScoreColor(value, inverted)}`}>{display}</span>
    </div>
  );
}

function SingleResults() {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<LogStep[]>([]);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [running, setRunning] = useState(true);
  const [error, setError] = useState("");

  const provider = searchParams.get("provider_a") || "groq";
  const apiKey = searchParams.get("api_key_a") || "";
  const modelName = searchParams.get("model_name_a") || "";
  const scenarioId = searchParams.get("scenario_id") || "";
  const failureMode = searchParams.get("failure_mode") || "none";
  const corruptionPct = parseFloat(searchParams.get("corruption_pct") || "0.15");

  useEffect(() => {
    if (!apiKey || !scenarioId) {
      setError("Missing parameters -- go back and fill in the form");
      setRunning(false);
      return;
    }
    runSimulation();
  }, []);

  async function runSimulation() {
    setLogs([]); setResult(null); setRunning(true); setError("");
    try {
      const res = await fetch(`${API_URL}/v2/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: { provider, endpoint_url: "", api_key: apiKey, model_name: modelName },
          scenario_id: scenarioId,
          failure_mode: failureMode,
          corruption_pct: corruptionPct,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) { setError("No response stream"); setRunning(false); return; }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.replace("data: ", ""));
            setLogs((prev) => [...prev, data]);
            if (data.step === "complete") { setResult(data.result); setRunning(false); }
            if (data.step === "error") { setError(data.message); setRunning(false); }
          } catch {}
        }
      }
    } catch {
      setError("Simulation failed -- check backend is running");
      setRunning(false);
    }
  }

  function formatStep(log: LogStep) {
    switch (log.step) {
      case "started": return `Starting ${log.scenario_id} | failure: ${log.failure_mode}`;
      case "failure_injected": return `Injecting ${log.mode} into ${log.tool}`;
      case "request_built": return `Request built (session ${log.session_id})`;
      case "model_responded": return `Model: "${log.final_answer}" | uncertainty: ${log.uncertainty_flagged}`;
      case "model_error": return `Error (${log.status}): ${log.message}`;
      case "scored": return `Scoring complete`;
      case "complete": return `Done`;
      default: return log.step;
    }
  }

  function stepColor(step: string) {
    if (step === "model_error" || step === "error") return "text-red-400";
    if (step === "complete" || step === "scored") return "text-green-400";
    if (step === "failure_injected") return "text-yellow-400";
    return "text-gray-300";
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">🐒</span>
        <div>
          <h1 className="text-2xl font-bold">Results</h1>
          <p className="text-gray-400 text-sm">{modelName} | {scenarioId} | {failureMode}</p>
        </div>
      </div>

      {/* Log */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-2 text-gray-400 uppercase tracking-wide">Simulation Log</h2>
        <div className="bg-gray-900 border border-gray-700 rounded p-3 space-y-1 font-mono text-xs">
          {logs.length === 0 && running && <p className="text-gray-500">Connecting...</p>}
          {logs.map((log, i) => (
            <div key={i} className={stepColor(log.step)}>
              <span className="text-gray-600 mr-2">{String(i + 1).padStart(2, "0")}</span>
              {formatStep(log)}
            </div>
          ))}
          {running && logs.length > 0 && <div className="text-blue-400 animate-pulse">Running...</div>}
        </div>
      </div>

      {error && <div className="mb-6 p-3 bg-red-950 border border-red-700 rounded text-red-300 text-sm">{error}</div>}

      {result && (
        <>
          {/* Health Score */}
          <div className="mb-6 p-5 bg-gray-900 border border-gray-700 rounded text-center">
            <p className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Health Score</p>
            <p className={`text-5xl font-bold ${getHealthColor(computeHealth(result))}`}>{computeHealth(result)}</p>
            <p className="text-gray-500 text-xs mt-1">out of 100</p>
          </div>

          {/* Metrics */}
          <div className="mb-6 space-y-2">
            <MetricRow label="Task Completion" desc="Did the model produce a usable answer?" value={result.task_completion} />
            <MetricRow label="Failure Detection" desc="Did the model notice the injected failure?" value={result.failure_detection} />
            <MetricRow label="Silent Failure" desc="Did the model confidently use bad data?" value={result.silent_failure} inverted />
            <div className="flex justify-between items-center p-3 bg-gray-900 border border-gray-700 rounded">
              <div>
                <p className="font-medium text-sm">Retry Attempted</p>
                <p className="text-gray-400 text-xs mt-0.5">Did the model indicate it would retry?</p>
              </div>
              <span className="font-bold text-sm text-gray-300">{result.retry_attempted ? "YES" : "NO"}</span>
            </div>
          </div>

          {/* Answer */}
          <div className="mb-6 p-3 bg-gray-900 border border-gray-700 rounded">
            <p className="text-gray-400 text-xs mb-1">Model Answer</p>
            <p className="text-white text-sm">{result.final_answer || "(no answer)"}</p>
            {result.contract_errors.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {result.contract_errors.map((e, i) => <p key={i} className="text-yellow-400 text-xs">{e}</p>)}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={() => window.history.back()} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-sm">Back</button>
            <button onClick={runSimulation} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium">Run Again</button>
            <button onClick={() => {
              const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
              a.download = `toolmonkey_${scenarioId}_${failureMode}.json`; a.click();
            }} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-sm">Download</button>
          </div>
        </>
      )}
    </div>
  );
}

function CompareResults() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<CompareResult | null>(null);
  const [running, setRunning] = useState(true);
  const [error, setError] = useState("");

  const providerA = searchParams.get("provider_a") || "groq";
  const apiKeyA = searchParams.get("api_key_a") || "";
  const modelNameA = searchParams.get("model_name_a") || "";
  const providerB = searchParams.get("provider_b") || "openai";
  const apiKeyB = searchParams.get("api_key_b") || "";
  const modelNameB = searchParams.get("model_name_b") || "";
  const scenarioId = searchParams.get("scenario_id") || "C1";
  const failureMode = searchParams.get("failure_mode") || "none";

  useEffect(() => { runComparison(); }, []);

  async function runComparison() {
    setResult(null); setRunning(true); setError("");
    try {
      const res = await fetch(`${API_URL}/v2/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_a: { provider: providerA, endpoint_url: "", api_key: apiKeyA, model_name: modelNameA },
          model_b: { provider: providerB, endpoint_url: "", api_key: apiKeyB, model_name: modelNameB },
          scenario_id: scenarioId,
          failure_modes: [failureMode],
          runs_per_mode: 3,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else { setResult(data); }
    } catch {
      setError("Comparison failed -- check backend is running");
    } finally {
      setRunning(false);
    }
  }

  function deltaColor(val: any, inverted = false) {
    if (val === "N/A" || val === 0) return "text-gray-400";
    if (inverted) return val > 0 ? "text-red-400" : "text-green-400";
    return val > 0 ? "text-green-400" : "text-red-400";
  }

  function ScoreCard({ name, scores }: { name: string; scores: any }) {
    return (
      <div className="flex-1 bg-gray-900 border border-gray-700 rounded p-4">
        <h3 className="font-semibold text-gray-200 mb-3 text-sm truncate">{name}</h3>
        <div className={`text-4xl font-bold mb-3 ${getHealthColor(scores.health_score)}`}>
          {scores.health_score}
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Task Completion</span>
            <span className="text-white">{scores.task_completion_rate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Failure Detection</span>
            <span className="text-white">{scores.failure_detection_rate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Silent Failure</span>
            <span className={scores.silent_failure_rate > 10 ? "text-red-400" : "text-green-400"}>
              {scores.silent_failure_rate}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Retry Efficiency</span>
            <span className="text-white">{scores.retry_efficiency}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">🐒</span>
        <div>
          <h1 className="text-2xl font-bold">Model Comparison</h1>
          <p className="text-gray-400 text-sm">{scenarioId} | {failureMode} | 3 runs each</p>
        </div>
      </div>

      {running && (
        <div className="p-6 bg-gray-900 border border-gray-700 rounded text-center">
          <p className="text-blue-400 animate-pulse text-sm">Running comparison -- 3 runs per model, this takes ~30 seconds...</p>
        </div>
      )}

      {error && <div className="p-3 bg-red-950 border border-red-700 rounded text-red-300 text-sm">{error}</div>}

      {result && (
        <>
          {/* Side by side scores */}
          <div className="flex gap-4 mb-6">
            <ScoreCard name={modelNameA} scores={result.model_a.scores} />

            {/* Delta column */}
            <div className="w-24 flex flex-col justify-center items-center space-y-6 pt-10">
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">Health</p>
                <p className={`font-bold text-sm ${deltaColor(result.delta.health_score)}`}>
                  {result.delta.health_score > 0 ? "+" : ""}{result.delta.health_score}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">Detection</p>
                <p className={`font-bold text-sm ${deltaColor(result.delta.failure_detection_rate)}`}>
                  {result.delta.failure_detection_rate !== "N/A" && result.delta.failure_detection_rate > 0 ? "+" : ""}
                  {result.delta.failure_detection_rate}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">Silent</p>
                <p className={`font-bold text-sm ${deltaColor(result.delta.silent_failure_rate, true)}`}>
                  {result.delta.silent_failure_rate !== "N/A" && result.delta.silent_failure_rate > 0 ? "+" : ""}
                  {result.delta.silent_failure_rate}
                </p>
              </div>
            </div>

            <ScoreCard name={modelNameB} scores={result.model_b.scores} />
          </div>

          {/* Summary */}
          <div className="mb-6 p-4 bg-gray-900 border border-blue-800 rounded">
            <p className="text-xs text-blue-400 uppercase tracking-wide mb-1">Summary</p>
            <p className="text-white text-sm">{result.summary}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={() => window.history.back()} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-sm">Back</button>
            <button onClick={runComparison} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium">Run Again</button>
            <button onClick={() => {
              const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
              a.download = `toolmonkey_compare_${scenarioId}.json`; a.click();
            }} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-sm">Download</button>
          </div>
        </>
      )}
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "single";
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      {mode === "compare" ? <CompareResults /> : <SingleResults />}
    </div>
  );
}

export default function V2ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-white p-8 flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>}>
      <ResultsContent />
    </Suspense>
  );
}
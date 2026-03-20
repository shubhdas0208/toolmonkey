"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const T = {
  bg:        "#1e1714",
  bgCard:    "#2a1f1b",
  bgInset:   "#372c2e",
  bgHover:   "#3f3330",
  border:    "#4a3a35",
  borderAct: "#de9e48",
  gold:      "#de9e48",
  goldHov:   "#e8ae5a",
  text:      "#ffffff",
  textSec:   "#ffffff",
  textMut:   "#bfbfbf",
  green:     "#34c759",
  amber:     "#ff9f0a",
  red:       "#ff3b30",
  font:      `"Satoshi", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
  mono:      `"JetBrains Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace`,
};

const LEFT_PCT = 40;

interface ScoreResult {
  scenario_id: string; failure_mode: string;
  task_completion: number; failure_detection: number;
  retry_efficiency: number; silent_failure: number;
  final_answer: string | null; uncertainty_flagged: boolean;
  retry_attempted: boolean; contract_valid: boolean; contract_errors: string[];
}

interface CompareResult {
  scenario_id: string; failure_modes_tested: string[];
  model_a: { name: string; scores: any };
  model_b: { name: string; scores: any };
  delta: any; summary: string;
}

interface LogStep { step: string; [key: string]: any; }

function healthColor(score: number) {
  if (score >= 70) return T.green;
  if (score >= 40) return T.amber;
  return T.red;
}

function computeHealth(r: ScoreResult) {
  return Math.round(r.task_completion * 40 + (r.failure_detection === -1 ? 30 : r.failure_detection * 30) + (1 - r.silent_failure) * 30);
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 600, fontFamily: T.font, color: T.textMut, letterSpacing: "0.08em", textTransform: "uppercase" as const, margin: "0 0 8px" }}>
      {children}
    </p>
  );
}

function GradientBg() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "55%", height: "60%", background: "radial-gradient(ellipse at center, rgba(122,67,29,0.28) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div style={{ position: "absolute", bottom: "-15%", right: "-10%", width: "55%", height: "55%", background: "radial-gradient(ellipse at center, rgba(222,158,72,0.15) 0%, transparent 70%)", filter: "blur(80px)" }} />
    </div>
  );
}

function NavBar({ subtitle }: { subtitle: string }) {
  return (
    <nav style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderBottom: `1px solid ${T.border}`, background: "rgba(30,23,20,0.85)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <a href="/setup" style={{ textDecoration: "none" }}>
          <div style={{ padding: "4px 12px", background: "rgba(222,158,72,0.08)", border: "1px solid rgba(222,158,72,0.25)", borderRadius: 8, boxShadow: "0 0 12px rgba(222,158,72,0.2), 0 0 24px rgba(222,158,72,0.08)", display: "inline-flex", alignItems: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 800, fontFamily: T.font }}>
              <span style={{ color: T.text }}>Tool</span>
              <span style={{ color: T.gold }}>Monkey</span>
            </span>
          </div>
        </a>
        <span style={{ color: T.border, fontSize: 16 }}>·</span>
        <span style={{ fontSize: 13, color: T.textMut, fontFamily: T.font }}>{subtitle}</span>
      </div>
      <a href="/setup" style={{ textDecoration: "none" }}>
        <button style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 12px", color: T.textMut, fontFamily: T.font, fontSize: 12, cursor: "pointer", transition: "border-color 0.18s, color 0.18s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.gold; (e.currentTarget as HTMLButtonElement).style.color = T.gold; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.textMut; }}
        >{"← Back"}</button>
      </a>
    </nav>
  );
}

function ActionButtons({ primary, onPrimary, onDownload }: { primary: string; onPrimary: () => void; onDownload: () => void }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <a href="/setup" style={{ flex: 1, textDecoration: "none" }}>
        <button style={{ width: "100%", height: 44, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10, color: T.textMut, fontFamily: T.font, fontSize: 13, fontWeight: 400, cursor: "pointer", transition: "all 0.18s ease" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.gold; (e.currentTarget as HTMLButtonElement).style.color = T.gold; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.textMut; }}
        >Back</button>
      </a>
      <button onClick={onPrimary} style={{ flex: 1, height: 44, background: T.gold, border: `1px solid ${T.gold}`, borderRadius: 10, color: "#1e1714", fontFamily: T.font, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.18s ease" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = T.goldHov; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = T.gold; }}
      >{primary}</button>
      <button onClick={onDownload} style={{ flex: 1, height: 44, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10, color: T.textMut, fontFamily: T.font, fontSize: 13, fontWeight: 400, cursor: "pointer", transition: "all 0.18s ease" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.gold; (e.currentTarget as HTMLButtonElement).style.color = T.gold; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.textMut; }}
      >Download</button>
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
    if (!apiKey || !scenarioId) { setError("Missing parameters — go back and fill in the form."); setRunning(false); return; }
    runSimulation();
  }, []);

  async function runSimulation() {
    setLogs([]); setResult(null); setRunning(true); setError("");
    try {
      const res = await fetch(API_URL + "/v2/simulate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: { provider, endpoint_url: "", api_key: apiKey, model_name: modelName }, scenario_id: scenarioId, failure_mode: failureMode, corruption_pct: corruptionPct }),
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
    } catch { setError("Simulation failed — check the backend is running."); setRunning(false); }
  }

  function formatStep(log: LogStep) {
    switch (log.step) {
      case "started": return "Starting " + log.scenario_id + " | failure: " + log.failure_mode;
      case "failure_injected": return "Injecting " + log.mode + " into " + log.tool;
      case "request_built": return "Request built (session " + log.session_id + ")";
      case "model_responded": return "Model: \"" + log.final_answer + "\" | uncertainty: " + log.uncertainty_flagged;
      case "model_error": return "Error (" + log.status + "): " + log.message;
      case "scored": return "Scoring complete";
      case "complete": return "Done";
      default: return log.step;
    }
  }

  function stepColor(step: string) {
    if (step === "model_error" || step === "error") return T.red;
    if (step === "complete" || step === "scored") return T.green;
    if (step === "failure_injected") return T.amber;
    return T.textSec;
  }

  const health = result ? computeHealth(result) : null;

  return (
    <>
      <NavBar subtitle={scenarioId + " — " + failureMode} />
      <div style={{ display: "flex", height: "calc(100vh - 48px)", width: "100%", position: "relative", zIndex: 1, overflow: "hidden" }}>

        {/* LEFT — log */}
        <div style={{ width: LEFT_PCT + "%", flexShrink: 0, padding: "20px 20px", borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: T.text, margin: "0 0 4px", fontFamily: T.font }}>Simulation Log</h2>
          <p style={{ fontSize: 12, color: T.textMut, margin: "0 0 12px", fontFamily: T.font }}>{modelName + " · " + scenarioId + " · " + failureMode}</p>
          <div style={{ background: T.bgInset, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", fontFamily: T.mono, fontSize: 12, lineHeight: 1.8, flex: 1, overflowY: "auto" }}>
            {logs.length === 0 && running && <span style={{ color: T.textMut }}>Connecting...</span>}
            {logs.map((log, i) => (
              <div key={i} style={{ color: stepColor(log.step) }}>
                <span style={{ color: T.textMut, marginRight: 10, userSelect: "none" as const }}>{String(i + 1).padStart(2, "0")}</span>
                {formatStep(log)}
              </div>
            ))}
            {running && logs.length > 0 && <div style={{ color: T.gold, marginTop: 4, fontSize: 11 }}>{"● Running..."}</div>}
          </div>
          {error && <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.25)", borderRadius: 10, fontSize: 13, color: T.red, fontFamily: T.font }}>{error}</div>}
        </div>

        {/* RIGHT — scores */}
        <div style={{ flex: 1, padding: "16px 24px 16px", display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto" }}>
          <div style={{ width: "100%", maxWidth: 520 }}>

            {!result && !error && running && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 280, gap: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${T.border}`, borderTopColor: T.gold, animation: "spin 0.8s linear infinite" }} />
                <p style={{ fontSize: 13, color: T.textMut, fontFamily: T.font }}>Running simulation...</p>
              </div>
            )}

            {result && (
              <>
                {/* Health score */}
                <div style={{ textAlign: "center", padding: "12px 16px", background: "rgba(42,31,27,0.7)", border: `1px solid ${T.border}`, borderRadius: 14, marginBottom: 8, backdropFilter: "blur(12px)" }}>
                  <Label>Health Score</Label>
                  <p style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-0.05em", color: healthColor(health!), margin: "0 0 2px", lineHeight: 1, fontFamily: T.font }}>{health}</p>
                  <p style={{ fontSize: 12, color: T.textMut, margin: 0, fontFamily: T.font }}>out of 100</p>
                  <div style={{ height: 4, background: T.bgInset, borderRadius: 2, margin: "8px auto 0", maxWidth: 140, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: health + "%", background: healthColor(health!), borderRadius: 2, transition: "width 0.8s cubic-bezier(0.25,0.46,0.45,0.94)" }} />
                  </div>
                </div>

                {/* Metrics 2x2 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                  {[
                    { label: "Task Completion",   desc: "Usable answer?",         value: result.task_completion,         inverted: false },
                    { label: "Failure Detection", desc: "Noticed the failure?",    value: result.failure_detection,       inverted: false },
                    { label: "Silent Failure",    desc: "Used bad data silently?", value: result.silent_failure,          inverted: true  },
                    { label: "Retry Attempted",   desc: "Indicated a retry?",      value: result.retry_attempted ? 1 : 0, inverted: false },
                  ].map(({ label, desc, value, inverted }) => {
                    const display = value === -1 ? "N/A" : inverted ? (value === 0 ? "Clean" : "Silent Fail") : label === "Task Completion" ? (value === 1 ? "Pass" : "Fail") : label === "Failure Detection" ? (value === 1 ? "Detected" : "Missed") : label === "Retry Attempted" ? (value === 1 ? "Yes" : "No") : value === 1 ? "Yes" : "No";
                    const color = value === -1 ? T.textMut : inverted ? (value === 0 ? T.green : T.red) : label === "Retry Attempted" ? (value === 1 ? T.gold : T.textMut) : value === 1 ? T.green : T.red;
                    return (
                      <div key={label} style={{ padding: "10px 12px", background: "rgba(42,31,27,0.7)", border: `1px solid ${T.border}`, borderRadius: 10, backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", gap: 4 }}>
                        <p style={{ fontSize: 11, color: T.textMut, margin: 0, fontFamily: T.font }}>{desc}</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: 0, fontFamily: T.font }}>{label}</p>
                        <p style={{ fontSize: 20, fontWeight: 800, color, margin: 0, fontFamily: T.font, letterSpacing: "-0.02em" }}>{display}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Answer */}
                <div style={{ padding: "10px 12px", background: "rgba(42,31,27,0.7)", border: `1px solid ${T.border}`, borderRadius: 12, marginBottom: 8, backdropFilter: "blur(8px)" }}>
                  <Label>Model Answer</Label>
                  <p style={{ fontSize: 13, color: T.text, margin: 0, lineHeight: 1.6, fontFamily: T.font }}>{result.final_answer || "(no answer)"}</p>
                  {result.contract_errors.length > 0 && (
                    <div style={{ marginTop: 8, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
                      {result.contract_errors.map((e, i) => <p key={i} style={{ fontSize: 12, color: T.amber, margin: "0 0 3px", fontFamily: T.font }}>{e}</p>)}
                    </div>
                  )}
                </div>

                <ActionButtons primary="Run Again" onPrimary={runSimulation} onDownload={() => {
                  const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
                  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "toolmonkey_" + scenarioId + "_" + failureMode + ".json"; a.click();
                }} />
              </>
            )}
          </div>
        </div>
      </div>
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </>
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
      const res = await fetch(API_URL + "/v2/compare", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_a: { provider: providerA, endpoint_url: "", api_key: apiKeyA, model_name: modelNameA }, model_b: { provider: providerB, endpoint_url: "", api_key: apiKeyB, model_name: modelNameB }, scenario_id: scenarioId, failure_modes: [failureMode], runs_per_mode: 3 }),
      });
      const data = await res.json();
      if (data.error) setError(data.error); else setResult(data);
    } catch { setError("Comparison failed — check the backend is running."); }
    finally { setRunning(false); }
  }

  function deltaColor(val: any, inverted = false) {
    if (val === "N/A" || val === 0) return T.textMut;
    if (inverted) return val > 0 ? T.red : T.green;
    return val > 0 ? T.green : T.red;
  }

  function ScoreCard({ name, scores }: { name: string; scores: any }) {
    return (
      <div style={{ flex: 1, padding: "18px 20px", background: "rgba(42,31,27,0.7)", border: `1px solid ${T.border}`, borderRadius: 14, backdropFilter: "blur(12px)" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: T.textMut, fontFamily: T.font, letterSpacing: "0.06em", textTransform: "uppercase" as const, margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{name}</p>
        <p style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-0.04em", color: healthColor(scores.health_score), margin: "0 0 16px", lineHeight: 1, fontFamily: T.font }}>{scores.health_score}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Task Completion",  val: scores.task_completion_rate + "%",  warn: false },
            { label: "Failure Detection",val: scores.failure_detection_rate + "%",warn: false },
            { label: "Silent Failure",   val: scores.silent_failure_rate + "%",   warn: scores.silent_failure_rate > 10 },
            { label: "Retry Efficiency", val: "" + scores.retry_efficiency,        warn: false },
          ].map(({ label, val, warn }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: T.textMut, fontFamily: T.font }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: warn ? T.red : T.text, fontFamily: T.font }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <NavBar subtitle={scenarioId + " — Compare"} />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 60px", position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", color: T.text, margin: "0 0 4px", fontFamily: T.font }}>Model Comparison</h1>
          <p style={{ fontSize: 13, color: T.textMut, margin: 0, fontFamily: T.font }}>{scenarioId + " · " + failureMode + " · 3 runs each"}</p>
        </div>
        {running && (
          <div style={{ padding: "40px 24px", textAlign: "center", background: "rgba(42,31,27,0.7)", border: `1px solid ${T.border}`, borderRadius: 14, backdropFilter: "blur(12px)" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${T.border}`, borderTopColor: T.gold, animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13, color: T.textMut, margin: 0, fontFamily: T.font }}>Running comparison — 3 runs per model, ~30 seconds...</p>
          </div>
        )}
        {error && <div style={{ padding: "12px 14px", background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.25)", borderRadius: 10, fontSize: 13, color: T.red, fontFamily: T.font }}>{error}</div>}
        {result && (
          <>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16 }}>
              <ScoreCard name={modelNameA} scores={result.model_a.scores} />
              <div style={{ width: 68, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, paddingTop: 68 }}>
                {[
                  { label: "Health",    val: result.delta.health_score,           inv: false },
                  { label: "Detection", val: result.delta.failure_detection_rate, inv: false },
                  { label: "Silent",    val: result.delta.silent_failure_rate,    inv: true  },
                ].map(({ label, val, inv }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 10, color: T.textMut, margin: "0 0 2px", fontFamily: T.font }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: deltaColor(val, inv), margin: 0, fontFamily: T.font }}>{val !== "N/A" && val > 0 ? "+" : ""}{val}</p>
                  </div>
                ))}
              </div>
              <ScoreCard name={modelNameB} scores={result.model_b.scores} />
            </div>
            <div style={{ padding: "14px 16px", marginBottom: 20, background: "rgba(42,31,27,0.7)", border: `1px solid ${T.borderAct}`, borderRadius: 12, backdropFilter: "blur(12px)" }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: T.gold, textTransform: "uppercase" as const, letterSpacing: "0.07em", margin: "0 0 6px", fontFamily: T.font }}>Summary</p>
              <p style={{ fontSize: 14, color: T.text, margin: 0, lineHeight: 1.6, fontFamily: T.font }}>{result.summary}</p>
            </div>
            <ActionButtons primary="Run Again" onPrimary={runComparison} onDownload={() => {
              const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "toolmonkey_compare_" + scenarioId + ".json"; a.click();
            }} />
          </>
        )}
      </div>
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "single";
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.font, position: "relative" }}>
      <GradientBg />
      {mode === "compare" ? <CompareResults /> : <SingleResults />}
    </div>
  );
}

export default function V2ResultsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #4a3a35", borderTopColor: "#de9e48", animation: "spin 0.8s linear infinite" }} />
        <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
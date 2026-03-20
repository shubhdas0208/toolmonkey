"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

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

function GradientBg() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "55%", height: "60%", background: "radial-gradient(ellipse at center, rgba(122,67,29,0.28) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div style={{ position: "absolute", bottom: "-15%", right: "-10%", width: "55%", height: "55%", background: "radial-gradient(ellipse at center, rgba(222,158,72,0.15) 0%, transparent 70%)", filter: "blur(80px)" }} />
      <div style={{ position: "absolute", top: "40%", left: "40%", width: "40%", height: "40%", background: "radial-gradient(ellipse at center, rgba(90,40,20,0.2) 0%, transparent 70%)", filter: "blur(60px)" }} />
    </div>
  );
}

function PulseDot() {
  return (
    <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: T.gold, marginLeft: 6, verticalAlign: "middle", animation: "pulseDot 1.5s ease-in-out infinite", flexShrink: 0 }} />
  );
}

function SliderTabs({ options, value, onChange, fullWidth = false }: {
  options: { value: string; label: string }[]; value: string;
  onChange: (v: string) => void; fullWidth?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const activeIdx = options.findIndex((o) => o.value === value);

  const updatePill = useCallback(() => {
    const btn = btnRefs.current[activeIdx];
    const container = containerRef.current;
    if (!btn || !container) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    setPill({ left: bRect.left - cRect.left, width: bRect.width });
  }, [activeIdx]);

  useEffect(() => { updatePill(); }, [updatePill]);
  useEffect(() => {
    const ro = new ResizeObserver(updatePill);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [updatePill]);

  return (
    <div ref={containerRef} role="tablist" style={{ position: "relative", display: fullWidth ? "flex" : "inline-flex", background: T.bgInset, border: `1px solid ${T.border}`, borderRadius: 10, padding: 3, width: fullWidth ? "100%" : undefined }}>
      <div style={{ position: "absolute", top: 3, bottom: 3, left: pill.left + 3, width: pill.width - 6, background: T.gold, borderRadius: 7, transition: "left 0.22s cubic-bezier(0.4,0,0.2,1), width 0.22s cubic-bezier(0.4,0,0.2,1)", pointerEvents: "none", zIndex: 0 }} />
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button key={opt.value} ref={(el) => { btnRefs.current[i] = el; }} role="tab" aria-selected={active} onClick={() => onChange(opt.value)}
            style={{ flex: fullWidth ? 1 : undefined, position: "relative", zIndex: 1, padding: "7px 14px", border: "none", borderRadius: 7, background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400, fontFamily: T.font, color: active ? "#1e1714" : T.textMut, letterSpacing: "-0.01em", transition: "color 0.18s ease", whiteSpace: "nowrap" as const }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function AnimatedDropdown({ options, value, onChange, placeholder = "Select...", dropUp = false, showNudge = false }: {
  options: string[]; value: string; onChange: (v: string) => void;
  placeholder?: string; dropUp?: boolean; showNudge?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen((o) => !o);
  }

  return (
    <div style={{ position: "relative" }}>
      <button ref={btnRef} onClick={handleOpen} style={{ width: "100%", padding: "9px 12px", background: T.bgInset, border: `1px solid ${open ? T.borderAct : showNudge ? T.gold : T.border}`, borderRadius: 8, color: value ? T.text : T.textMut, fontFamily: T.font, fontSize: 13, textAlign: "left" as const, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "border-color 0.18s ease", boxShadow: showNudge ? "0 0 8px rgba(222,158,72,0.3)" : "none" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{value || placeholder}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {showNudge && !value && <PulseDot />}
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1)" }}>
            <path d="M2 4l4 4 4-4" stroke={T.textMut} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
      {mounted && createPortal(
        <div ref={listRef} style={{
          position: "fixed", top: coords.top, left: coords.left, width: coords.width,
          background: "#140f0d", border: `1px solid ${T.border}`, borderRadius: 8,
          maxHeight: open ? 280 : 0, opacity: open ? 1 : 0,
          transition: "max-height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease",
          zIndex: 99999, boxShadow: "0 8px 32px rgba(0,0,0,0.95)",
          overflowY: "auto" as const, pointerEvents: open ? "auto" : "none",
        }}>
          {options.map((opt, i) => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{ width: "100%", padding: "9px 12px", background: opt === value ? T.bgInset : "transparent", border: "none", borderBottom: i < options.length - 1 ? `1px solid ${T.border}` : "none", color: opt === value ? T.gold : T.textSec, fontFamily: T.font, fontSize: 13, textAlign: "left" as const, cursor: "pointer", display: "block" }}
              onMouseEnter={(e) => { if (opt !== value) (e.currentTarget as HTMLButtonElement).style.background = T.bgHover; }}
              onMouseLeave={(e) => { if (opt !== value) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >{opt}</button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

function ApiKeyTooltip() {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 6 }}>
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} style={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid ${T.gold}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 0 6px rgba(222,158,72,0.5)", animation: "apiGlow 2s ease-in-out infinite", flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.gold, lineHeight: 1 }}>i</span>
      </div>
      {show && (
        <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", width: 260, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 100 }}>
          <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 8, height: 8, background: T.bgCard, border: `1px solid ${T.border}`, borderTop: "none", borderLeft: "none" }} />
          <ul style={{ margin: 0, padding: "0 0 0 14px" }}>
            <li style={{ fontSize: 11, color: T.textSec, fontFamily: T.font, lineHeight: 1.6, marginBottom: 6 }}>We know giving your API key is scary, but it is used for this session only and discarded immediately. Never stored or logged.</li>
            <li style={{ fontSize: 11, color: T.textSec, fontFamily: T.font, lineHeight: 1.6 }}>Without the API keys we cannot test the LLM behaviour under induced failure.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function Label({ children, showTooltip = false, showNudge = false }: { children: React.ReactNode; showTooltip?: boolean; showNudge?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 5 }}>
      <p style={{ fontSize: 11, fontWeight: 600, fontFamily: T.font, color: T.textMut, letterSpacing: "0.07em", textTransform: "uppercase" as const, margin: 0 }}>{children}</p>
      {showTooltip && <ApiKeyTooltip />}
      {showNudge && <PulseDot />}
    </div>
  );
}

function Divider() { return <div style={{ height: 1, background: T.border, margin: "10px 0" }} />; }

const FAILURE_MODES = [
  { value: "malformed_json", label: "Malformed JSON", description: "Broken response structure" },
  { value: "timeout",        label: "Timeout",        description: "Tool takes 15s to respond" },
  { value: "wrong_answer",   label: "Wrong Answer",   description: "Plausible but incorrect data" },
  { value: "silent_failure", label: "Silent Failure", description: "Null response with 200 OK" },
  { value: "none",           label: "No Failure",     description: "Control run — clean response" },
];

const SCENARIOS = [
  { id: "C1",  label: "847 x 23 (Calculator)" },
  { id: "C2",  label: "Compound Interest (Calculator)" },
  { id: "C3",  label: "Percentage: 340 of 1700 (Calculator)" },
  { id: "S1",  label: "Latest Python version (Search)" },
  { id: "S2",  label: "OpenAI CEO (Search)" },
  { id: "S3",  label: "LangChain version (Search)" },
  { id: "D1",  label: "User record ID 1042 (Database)" },
  { id: "D2",  label: "Product record ID 77 (Database)" },
  { id: "W1",  label: "Mumbai temperature (Weather)" },
  { id: "W2",  label: "London rain check (Weather)" },
  { id: "SM1", label: "Summarize neural networks (Summarizer)" },
  { id: "SM2", label: "Summarize product review (Summarizer)" },
  { id: "CE1", label: "Run print(2**10) (Code)" },
  { id: "CE2", label: "Run len('ToolMonkey') (Code)" },
  { id: "CE3", label: "Run sum([1..5]) (Code)" },
];

const SCENARIO_OPTIONS = SCENARIOS.map((s) => s.id + " - " + s.label);
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PROVIDERS = [
  { value: "groq",      label: "Groq" },
  { value: "openai",    label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini",    label: "Gemini" },
  { value: "deepseek",  label: "DeepSeek" },
];

const KEY_PLACEHOLDERS: Record<string, string> = {
  groq: "gsk_...", openai: "sk-...", anthropic: "sk-ant-...",
  gemini: "AIza...", deepseek: "sk-...",
};

interface ProviderConfig { models: string[]; default_model: string; }
interface ModelState {
  provider: string; apiKey: string; modelName: string;
  keyStatus: null | "valid" | "invalid"; validating: boolean; error: string;
}

function defaultModel(p: Record<string, ProviderConfig>, provider: string) {
  return p[provider]?.default_model || "";
}

function MascotImage({ size }: { size: number }) {
  const [imgError, setImgError] = useState(false);
  const [extIdx, setExtIdx] = useState(0);
  const extensions = ["png", "jpg", "jpeg"];
  function handleError() {
    if (extIdx < extensions.length - 1) setExtIdx((i) => i + 1);
    else setImgError(true);
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${T.border}`, background: T.bgInset, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {imgError
        ? <span style={{ fontSize: size * 0.35, fontWeight: 900, color: T.gold, fontFamily: T.font }}>TM</span>
        : <img src={"/" + "mascot." + extensions[extIdx]} alt="ToolMonkey mascot" onError={handleError} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      }
    </div>
  );
}

function ModelCard({ label, state, providers, onChange, onValidate, showNudge }: {
  label: string; state: ModelState; providers: Record<string, ProviderConfig>;
  onChange: (u: Partial<ModelState>) => void; onValidate: () => void; showNudge: boolean;
}) {
  const models = providers[state.provider]?.models || [];
  return (
    <div style={{ flex: 1, background: T.bgInset, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
      <p style={{ fontSize: 10, fontWeight: 700, fontFamily: T.font, color: T.gold, letterSpacing: "0.1em", textTransform: "uppercase" as const, margin: "0 0 12px" }}>{label}</p>
      <div style={{ marginBottom: 10 }}>
        <Label>Provider</Label>
        <SliderTabs options={PROVIDERS} value={state.provider} onChange={(p) => onChange({ provider: p, modelName: defaultModel(providers, p), keyStatus: null, apiKey: "" })} fullWidth />
      </div>
      <div style={{ marginBottom: 10 }}>
        <Label>Model</Label>
        <AnimatedDropdown options={models} value={state.modelName} onChange={(m) => onChange({ modelName: m })} placeholder="Select model" />
      </div>
      <div>
        <Label showTooltip showNudge={showNudge && state.keyStatus !== "valid"}>API Key</Label>
        <div style={{ display: "flex", gap: 6 }}>
          <input type="password" value={state.apiKey} onChange={(e) => onChange({ apiKey: e.target.value, keyStatus: null })}
            placeholder={KEY_PLACEHOLDERS[state.provider] || "your-api-key"}
            style={{ flex: 1, height: 38, padding: "0 10px", background: T.bg, border: `1px solid ${state.keyStatus === "valid" ? T.green : state.keyStatus === "invalid" ? T.red : showNudge && state.keyStatus !== "valid" ? T.gold : T.border}`, borderRadius: 8, color: T.text, fontFamily: T.mono, fontSize: 11, outline: "none", transition: "border-color 0.18s ease", boxShadow: showNudge && state.keyStatus !== "valid" ? "0 0 8px rgba(222,158,72,0.25)" : "none" }}
            onFocus={(e) => { if (!state.keyStatus) e.currentTarget.style.borderColor = T.borderAct; }}
            onBlur={(e) => { if (!state.keyStatus) e.currentTarget.style.borderColor = showNudge && state.keyStatus !== "valid" ? T.gold : T.border; }}
          />
          <button onClick={onValidate} disabled={state.validating} style={{ height: 38, padding: "0 14px", background: T.gold, border: `1px solid ${T.gold}`, borderRadius: 8, color: "#1e1714", fontFamily: T.font, fontSize: 12, fontWeight: 600, cursor: state.validating ? "not-allowed" : "pointer", opacity: state.validating ? 0.6 : 1, transition: "background 0.18s ease", whiteSpace: "nowrap" as const }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = T.goldHov; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = T.gold; }}
          >{state.validating ? "..." : "Validate"}</button>
        </div>
        {state.keyStatus === "valid" && <p style={{ fontSize: 11, color: T.green, margin: "5px 0 0", fontFamily: T.font }}>{"✓ Key validated"}</p>}
        {state.keyStatus === "invalid" && <p style={{ fontSize: 11, color: T.red, margin: "5px 0 0", fontFamily: T.font }}>{state.error}</p>}
      </div>
    </div>
  );
}

// ─── Collapsible step card ────────────────────────────────────────────────────
function StepCard({
  stepNum, title, status, summary, expanded, onToggle, locked, children,
}: {
  stepNum: number; title: string;
  status: "locked" | "active" | "done";
  summary?: string; expanded: boolean; onToggle: () => void;
  locked: boolean; children: React.ReactNode;
}) {
  const borderColor = status === "done" ? T.green : status === "active" ? T.gold : T.border;

  return (
    <div style={{
      borderRadius: 14, marginBottom: 10,
      border: `1px solid ${borderColor}`,
      borderLeft: `3px solid ${borderColor}`,
      background: locked ? "rgba(30,23,20,0.4)" : "rgba(42,31,27,0.7)",
      backdropFilter: "blur(12px)",
      opacity: locked ? 0.4 : 1,
      pointerEvents: locked ? "none" : "auto",
      transition: "all 0.3s ease",
    }}>
      {/* Header — always visible, clickable when done */}
      <div
        onClick={status === "done" ? onToggle : undefined}
        style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, cursor: status === "done" ? "pointer" : "default" }}
      >
        {/* Step badge */}
        <div style={{
          width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, fontFamily: T.font,
          background: status === "done" ? T.green : status === "active" ? T.gold : T.bgInset,
          border: `1px solid ${borderColor}`,
          color: status === "done" || status === "active" ? "#1e1714" : T.textMut,
          transition: "all 0.3s ease",
        }}>
          {status === "done" ? "✓" : locked ? "🔒" : stepNum}
        </div>

        {/* Title + summary */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: status === "done" ? T.green : status === "active" ? T.text : T.textMut, fontFamily: T.font, letterSpacing: "-0.01em" }}>
            {title}
          </span>
          {status === "done" && summary && !expanded && (
            <span style={{ fontSize: 12, color: T.textMut, fontFamily: T.font, marginLeft: 10 }}>
              — {summary}
            </span>
          )}
        </div>

        {/* Edit / expand hint */}
        {status === "done" && (
          <span style={{ fontSize: 11, color: T.textMut, fontFamily: T.font, flexShrink: 0 }}>
            {expanded ? "▲ collapse" : "▼ edit"}
          </span>
        )}
        {locked && (
          <span style={{ fontSize: 11, color: T.textMut, fontFamily: T.font, flexShrink: 0 }}>
            Complete previous step first
          </span>
        )}
      </div>

      {/* Body — only when expanded or active */}
      {(status === "active" || (status === "done" && expanded)) && (
        <div style={{ padding: "0 16px 16px", animation: "stepUnlock 0.25s ease-out forwards" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SetupPage() {
  const router = useRouter();
  const LEFT_PCT = 25;

  const [providers, setProviders] = useState<Record<string, ProviderConfig>>({});
  const [mode, setMode] = useState<"single" | "compare">("single");
  const [scenarioDisplay, setScenarioDisplay] = useState("");
  const [failureMode, setFailureMode] = useState("malformed_json"); // default
  const [corruptionPct, setCorruptionPct] = useState(0.15);
  const [error, setError] = useState("");

  // Which done steps are expanded for editing
  const [step1Expanded, setStep1Expanded] = useState(false);
  const [step2Expanded, setStep2Expanded] = useState(false);

  const [modelA, setModelA] = useState<ModelState>({ provider: "groq", apiKey: "", modelName: "llama-3.3-70b-versatile", keyStatus: null, validating: false, error: "" });
  const [modelB, setModelB] = useState<ModelState>({ provider: "openai", apiKey: "", modelName: "gpt-4o-mini", keyStatus: null, validating: false, error: "" });

  useEffect(() => {
    fetch(API_URL + "/v2/providers").then((r) => r.json()).then(setProviders).catch(() => {});
  }, []);

  const aValid = modelA.keyStatus === "valid";
  const bValid = modelB.keyStatus === "valid";
  const step1Done = mode === "compare" ? (aValid && bValid) : aValid;
  const step2Done = step1Done && scenarioDisplay !== "";
  const runReady  = step2Done && !step1Expanded && !step2Expanded;

  // Auto-collapse step 1 when done, open step 2
  const prevStep1Done = useRef(false);
  useEffect(() => {
    if (step1Done && !prevStep1Done.current) {
      setStep1Expanded(false);
    }
    prevStep1Done.current = step1Done;
  }, [step1Done]);

  // Auto-collapse step 2 when task chosen and not re-editing
  const prevScenario = useRef("");
  useEffect(() => {
    if (scenarioDisplay && scenarioDisplay !== prevScenario.current) {
      setStep2Expanded(false);
    }
    prevScenario.current = scenarioDisplay;
  }, [scenarioDisplay]);

  // When step 1 is re-expanded for editing, lock step 3
  // (handled by runReady = !step1Expanded && !step2Expanded)

  const step1Status: "locked" | "active" | "done" = step1Done ? "done" : "active";
  const step2Status: "locked" | "active" | "done" = !step1Done ? "locked" : step2Done ? "done" : "active";
  const step3Status: "locked" | "active" | "done" = !step2Done ? "locked" : "active";

  const scenarioId = scenarioDisplay.split(" - ")[0];

  async function validateModel(state: ModelState, setState: (u: Partial<ModelState>) => void) {
    if (!state.apiKey.trim()) { setState({ error: "Enter an API key first", keyStatus: "invalid" }); return; }
    setState({ validating: true, error: "", keyStatus: null });
    try {
      const res = await fetch(API_URL + "/v2/validate-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: state.provider, api_key: state.apiKey, model_name: state.modelName }) });
      const data = await res.json();
      setState({ keyStatus: data.valid ? "valid" : "invalid", validating: false, error: data.valid ? "" : (data.error || "Invalid key") });
    } catch { setState({ keyStatus: "invalid", validating: false, error: "Could not reach backend" }); }
  }

  function run() {
    setError("");
    const params = new URLSearchParams({
      mode, provider_a: modelA.provider, api_key_a: modelA.apiKey, model_name_a: modelA.modelName,
      scenario_id: scenarioId, failure_mode: failureMode, corruption_pct: corruptionPct.toString(),
    });
    if (mode === "compare") {
      params.set("provider_b", modelB.provider);
      params.set("api_key_b", modelB.apiKey);
      params.set("model_name_b", modelB.modelName);
    }
    router.push("/results?" + params.toString());
  }

  const step1Summary = mode === "compare"
    ? modelA.modelName + " vs " + modelB.modelName
    : modelA.modelName;

  const step2Summary = scenarioDisplay
    ? scenarioDisplay.split(" - ")[0] + " · " + FAILURE_MODES.find((f) => f.value === failureMode)?.label
    : "";

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.font, position: "relative" }}>
      <GradientBg />
      <style>{`
        @keyframes pulseDot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.4); } }
        @keyframes apiGlow { 0%, 100% { box-shadow: 0 0 6px rgba(222,158,72,0.5); } 50% { box-shadow: 0 0 10px rgba(222,158,72,0.8); } }
        @keyframes privacyGlow { 0%, 100% { box-shadow: 0 0 8px rgba(222,158,72,0.3); } 50% { box-shadow: 0 0 16px rgba(222,158,72,0.6); } }
        @keyframes stepUnlock { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Nav */}
      <nav style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderBottom: `1px solid ${T.border}`, background: "rgba(30,23,20,0.85)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ padding: "6px 14px", background: "rgba(222,158,72,0.08)", border: "1px solid rgba(222,158,72,0.25)", borderRadius: 8, boxShadow: "0 0 12px rgba(222,158,72,0.2), 0 0 24px rgba(222,158,72,0.08)", display: "inline-flex", alignItems: "center" }}>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", fontFamily: T.font }}>
            <span style={{ color: T.text }}>Tool</span>
            <span style={{ color: T.gold }}>Monkey</span>
          </span>
        </div>
        <button onClick={() => router.push("/")} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 14px", color: T.textMut, fontFamily: T.font, fontSize: 12, cursor: "pointer", transition: "border-color 0.18s, color 0.18s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.gold; (e.currentTarget as HTMLButtonElement).style.color = T.gold; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.textMut; }}
        >{"← Back"}</button>
      </nav>

      <div style={{ display: "flex", minHeight: "calc(100vh - 48px)", width: "100%", position: "relative", zIndex: 1 }}>

        {/* LEFT */}
        <div style={{ width: LEFT_PCT + "%", flexShrink: 0, padding: "32px 24px 40px", borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", alignItems: "flex-start", position: "sticky", top: 48, height: "calc(100vh - 48px)", overflowY: "auto", boxSizing: "border-box" as const }}>
          <div style={{ width: "100%", marginBottom: 20 }}><MascotImage size={275} /></div>
          <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 8px", lineHeight: 1.05, fontFamily: T.font }}>
            <span style={{ color: T.text }}>Tool</span><span style={{ color: T.gold }}>Monkey</span>
          </h1>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: "0 0 8px", lineHeight: 1.3, fontFamily: T.font }}>Test before production breaks you.</h2>
          <p style={{ fontSize: 13, color: T.textMut, lineHeight: 1.6, margin: "0 0 16px", fontFamily: T.font }}>Inject controlled failures into LLM tool-calling agents. Measure exactly how they break.</p>
          <div style={{ background: T.gold, borderRadius: 10, padding: "12px 14px", width: "100%", boxSizing: "border-box" as const, marginBottom: 16, animation: "privacyGlow 3s ease-in-out infinite" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                <path d="M7 1L2 3.5V7c0 2.8 2.1 5.4 5 6 2.9-.6 5-3.2 5-6V3.5L7 1z" fill="#1e1714" fillOpacity="0.3" stroke="#1e1714" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#1e1714", margin: 0, lineHeight: 1.5, fontFamily: T.font }}>API keys are used for this session only and discarded immediately. Never stored or logged.</p>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <p style={{ fontSize: 11, color: T.textMut, letterSpacing: "0.05em", textTransform: "uppercase" as const, fontWeight: 500, fontFamily: T.font, margin: 0 }}>Chaos Monkey for LLM agents</p>
            <a href="https://www.linkedin.com/in/shubhsankalpdas/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontFamily: T.font, textDecoration: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
            >
              <span style={{ color: T.text }}>Made by </span>
              <span style={{ color: T.gold, textDecoration: "underline", textUnderlineOffset: "3px" }}>Shubh Sankalp Das</span>
            </a>
          </div>
        </div>

        {/* RIGHT — wizard */}
        <div style={{ flex: 1, padding: "24px 140px 40px", overflowY: "auto" }}>

          {/* Step 1 — Model Setup */}
          <StepCard
            stepNum={1} title="Model Setup" status={step1Status}
            summary={step1Summary} expanded={step1Expanded}
            onToggle={() => setStep1Expanded((v) => !v)}
            locked={false}
          >
            <div style={{ marginBottom: 12 }}>
              <Label>Test Mode</Label>
              <SliderTabs options={[{ value: "single", label: "Single Model Test" }, { value: "compare", label: "Compare Two Models" }]} value={mode} onChange={(v) => { setMode(v as "single" | "compare"); }} fullWidth />
            </div>
            <Divider />
            <div style={{ display: "flex", gap: 12, flexDirection: mode === "compare" ? "row" : "column" }}>
              <ModelCard label={mode === "compare" ? "Model A" : "Your Model"} state={modelA} providers={providers}
                onChange={(u) => setModelA((p) => ({ ...p, ...u }))}
                onValidate={() => validateModel(modelA, (u) => setModelA((p) => ({ ...p, ...u })))}
                showNudge={true}
              />
              {mode === "compare" && (
                <ModelCard label="Model B" state={modelB} providers={providers}
                  onChange={(u) => setModelB((p) => ({ ...p, ...u }))}
                  onValidate={() => validateModel(modelB, (u) => setModelB((p) => ({ ...p, ...u })))}
                  showNudge={aValid && !bValid}
                />
              )}
            </div>
            {!step1Done && (
              <p style={{ fontSize: 12, color: T.textMut, fontFamily: T.font, marginTop: 10, textAlign: "center" }}>
                {mode === "compare"
                  ? (!aValid && !bValid) ? "Validate both API keys to unlock next step"
                  : !aValid ? "Validate Model A key to continue"
                  : "Validate Model B key to continue"
                  : "Validate your API key to unlock next step"
                }
              </p>
            )}
          </StepCard>

          {/* Step 2 — Configure Test */}
          <StepCard
            stepNum={2} title="Configure Test" status={step2Status}
            summary={step2Summary} expanded={step2Expanded}
            onToggle={() => setStep2Expanded((v) => !v)}
            locked={!step1Done}
          >
            <div style={{ marginBottom: 12 }}>
              <Label showNudge={!scenarioDisplay}>Task</Label>
              <AnimatedDropdown options={SCENARIO_OPTIONS} value={scenarioDisplay} onChange={setScenarioDisplay} placeholder="Choose your task..." dropUp={true} showNudge={!scenarioDisplay} />
            </div>
            <Divider />
            <div>
              <Label>Failure Mode</Label>
              <SliderTabs options={FAILURE_MODES.map((f) => ({ value: f.value, label: f.label }))} value={failureMode} onChange={(v) => { setFailureMode(v); }} fullWidth />
              <p style={{ fontSize: 11, color: T.textMut, margin: "7px 0 0", fontFamily: T.font, minHeight: 14 }}>
                {FAILURE_MODES.find((f) => f.value === failureMode)?.description}
              </p>
            </div>
            {failureMode === "wrong_answer" && (
              <>
                <Divider />
                <div>
                  <Label>Corruption Intensity</Label>
                  <div style={{ padding: "12px 14px", background: T.bgInset, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                    <input type="range" min="0.05" max="0.50" step="0.05" value={corruptionPct} onChange={(e) => setCorruptionPct(parseFloat(e.target.value))} style={{ width: "100%", accentColor: T.gold, cursor: "pointer" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: T.textMut }}>{"5% — subtle"}</span>
                      <span style={{ fontSize: 10, color: T.textMut }}>{"50% — obvious"}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
            {!scenarioDisplay && (
              <p style={{ fontSize: 12, color: T.textMut, fontFamily: T.font, marginTop: 10, textAlign: "center" }}>
                Choose a task to unlock Run
              </p>
            )}
          </StepCard>

          {/* Step 3 — Run */}
          <StepCard
            stepNum={3} title="Run Simulation" status={step3Status}
            expanded={false} onToggle={() => {}}
            locked={!runReady}
          >
            {/* Config summary chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Model",   val: modelA.modelName },
                { label: "Task",    val: scenarioDisplay.split(" - ")[0] || "—" },
                { label: "Failure", val: FAILURE_MODES.find((f) => f.value === failureMode)?.label || failureMode },
              ].map(({ label, val }) => (
                <div key={label} style={{ padding: "6px 12px", background: T.bgInset, border: `1px solid ${T.border}`, borderRadius: 8, display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: T.textMut, fontFamily: T.font, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{label}</span>
                  <span style={{ fontSize: 12, color: T.text, fontFamily: T.font, fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>
            {error && <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.25)", borderRadius: 8, fontSize: 12, color: T.red, fontFamily: T.font }}>{error}</div>}
            <button onClick={run} style={{ width: "100%", height: 48, background: T.gold, border: "none", borderRadius: 10, color: "#1e1714", fontFamily: T.font, fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", cursor: "pointer", transition: "background 0.18s ease, transform 0.1s ease" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = T.goldHov)}
              onMouseLeave={(e) => (e.currentTarget.style.background = T.gold)}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >{mode === "compare" ? "Run Comparison" : "Run Simulation"}</button>
          </StepCard>

        </div>
      </div>
    </div>
  );
}
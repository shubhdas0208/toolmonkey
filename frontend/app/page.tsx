"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const FAILURE_MODES = [
  { value: "none", label: "No Failure", description: "Control run -- clean tool response" },
  { value: "timeout", label: "Timeout", description: "Tool takes 15s to respond" },
  { value: "wrong_answer", label: "Wrong Answer", description: "Plausible but incorrect data" },
  { value: "malformed_json", label: "Malformed JSON", description: "Broken response structure" },
  { value: "silent_failure", label: "Silent Failure", description: "Null response with 200 OK" },
];

const SCENARIOS = [
  { id: "C1", label: "847 x 23 (Calculator)" },
  { id: "C2", label: "Compound Interest (Calculator)" },
  { id: "C3", label: "Percentage: 340 of 1700 (Calculator)" },
  { id: "S1", label: "Latest Python version (Search)" },
  { id: "S2", label: "OpenAI CEO (Search)" },
  { id: "S3", label: "LangChain version (Search)" },
  { id: "D1", label: "User record ID 1042 (Database)" },
  { id: "D2", label: "Product record ID 77 (Database)" },
  { id: "W1", label: "Mumbai temperature (Weather)" },
  { id: "W2", label: "London rain check (Weather)" },
  { id: "SM1", label: "Summarize neural networks (Summarizer)" },
  { id: "SM2", label: "Summarize product review (Summarizer)" },
  { id: "CE1", label: "Run print(2**10) (Code)" },
  { id: "CE2", label: "Run len('ToolMonkey') (Code)" },
  { id: "CE3", label: "Run sum([1..5]) (Code)" },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PROVIDER_LABELS: Record<string, string> = {
  groq: "Groq", openai: "OpenAI", anthropic: "Anthropic",
  gemini: "Gemini", deepseek: "DeepSeek",
};

const KEY_PLACEHOLDERS: Record<string, string> = {
  groq: "gsk_...", openai: "sk-...", anthropic: "sk-ant-...",
  gemini: "AIza...", deepseek: "sk-...",
};

interface ProviderConfig { models: string[]; default_model: string; }
interface ModelState {
  provider: string; apiKey: string; modelName: string;
  keyStatus: null | "valid" | "invalid"; validating: boolean; error: string;
}

function defaultModel(providers: Record<string, ProviderConfig>, provider: string) {
  return providers[provider]?.default_model || "";
}

function ModelCard({
  label, state, providers, onChange, onValidate
}: {
  label: string;
  state: ModelState;
  providers: Record<string, ProviderConfig>;
  onChange: (updates: Partial<ModelState>) => void;
  onValidate: () => void;
}) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded p-4 flex-1">
      <h3 className="font-semibold text-gray-200 mb-4">{label}</h3>

      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Provider</label>
        <div className="grid grid-cols-3 gap-1">
          {Object.keys(PROVIDER_LABELS).map((p) => (
            <button
              key={p}
              onClick={() => onChange({
                provider: p,
                modelName: defaultModel(providers, p),
                keyStatus: null,
                apiKey: ""
              })}
              className={`py-1 rounded text-xs font-medium transition-colors ${
                state.provider === p
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 border border-gray-600 text-gray-400 hover:border-gray-400"
              }`}
            >
              {PROVIDER_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Model</label>
        <select
          value={state.modelName}
          onChange={(e) => onChange({ modelName: e.target.value })}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
        >
          {(providers[state.provider]?.models || []).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="mb-2">
        <label className="block text-xs text-gray-400 mb-1">API Key</label>
        <div className="flex gap-1">
          <input
            type="password"
            value={state.apiKey}
            onChange={(e) => onChange({ apiKey: e.target.value, keyStatus: null })}
            placeholder={KEY_PLACEHOLDERS[state.provider] || "your-api-key"}
            className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={onValidate}
            disabled={state.validating}
            className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-500 rounded text-xs disabled:opacity-50"
          >
            {state.validating ? "..." : "Validate"}
          </button>
        </div>
        {state.keyStatus === "valid" && <p className="text-green-400 text-xs mt-1">Key valid</p>}
        {state.keyStatus === "invalid" && <p className="text-red-400 text-xs mt-1">{state.error}</p>}
      </div>
    </div>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<Record<string, ProviderConfig>>({});
  const [mode, setMode] = useState<"single" | "compare">("single");
  const [scenarioId, setScenarioId] = useState("C1");
  const [failureMode, setFailureMode] = useState("none");
  const [corruptionPct, setCorruptionPct] = useState(0.15);
  const [error, setError] = useState("");

  const [modelA, setModelA] = useState<ModelState>({
    provider: "groq", apiKey: "", modelName: "llama-3.3-70b-versatile",
    keyStatus: null, validating: false, error: ""
  });
  const [modelB, setModelB] = useState<ModelState>({
    provider: "openai", apiKey: "", modelName: "gpt-4o-mini",
    keyStatus: null, validating: false, error: ""
  });

  useEffect(() => {
    fetch(`${API_URL}/v2/providers`)
      .then((r) => r.json())
      .then(setProviders)
      .catch(() => {});
  }, []);

  async function validateModel(
    state: ModelState,
    setState: (updates: Partial<ModelState>) => void
  ) {
    if (!state.apiKey.trim()) { setState({ error: "Enter API key first", keyStatus: "invalid" }); return; }
    setState({ validating: true, error: "", keyStatus: null });
    try {
      const res = await fetch(`${API_URL}/v2/validate-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: state.provider, api_key: state.apiKey, model_name: state.modelName }),
      });
      const data = await res.json();
      setState({
        keyStatus: data.valid ? "valid" : "invalid",
        validating: false,
        error: data.valid ? "" : (data.error || "Invalid key")
      });
    } catch {
      setState({ keyStatus: "invalid", validating: false, error: "Could not reach backend" });
    }
  }

  function run() {
    setError("");
    if (!modelA.apiKey.trim()) { setError("Enter Model A API key"); return; }
    if (modelA.keyStatus !== "valid") { setError("Validate Model A key first"); return; }
    if (mode === "compare") {
      if (!modelB.apiKey.trim()) { setError("Enter Model B API key"); return; }
      if (modelB.keyStatus !== "valid") { setError("Validate Model B key first"); return; }
    }

    const params = new URLSearchParams({
      mode,
      provider_a: modelA.provider,
      api_key_a: modelA.apiKey,
      model_name_a: modelA.modelName,
      scenario_id: scenarioId,
      failure_mode: failureMode,
      corruption_pct: corruptionPct.toString(),
    });

    if (mode === "compare") {
      params.set("provider_b", modelB.provider);
      params.set("api_key_b", modelB.apiKey);
      params.set("model_name_b", modelB.modelName);
    }

    router.push(`/results?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🐒</span>
            <h1 className="text-3xl font-bold">ToolMonkey</h1>
          </div>
          <p className="text-gray-400">Test your model's reliability under tool failure conditions before it reaches production.</p>
          <div className="mt-3 p-3 bg-gray-900 border border-gray-700 rounded text-sm text-gray-400">
            API keys are used for this session only and discarded immediately after. Never stored or logged.
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setMode("single")}
            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
              mode === "single" ? "bg-blue-600 text-white" : "bg-gray-900 border border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            Single Model Test
          </button>
          <button
            onClick={() => setMode("compare")}
            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
              mode === "compare" ? "bg-blue-600 text-white" : "bg-gray-900 border border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            Compare Two Models
          </button>
        </div>

        <div className={`mb-8 ${mode === "compare" ? "flex gap-4" : ""}`}>
          <ModelCard
            label={mode === "compare" ? "Model A" : "Your Model"}
            state={modelA}
            providers={providers}
            onChange={(u) => setModelA((prev) => ({ ...prev, ...u }))}
            onValidate={() => validateModel(modelA, (u) => setModelA((prev) => ({ ...prev, ...u })))}
          />
          {mode === "compare" && (
            <ModelCard
              label="Model B"
              state={modelB}
              providers={providers}
              onChange={(u) => setModelB((prev) => ({ ...prev, ...u }))}
              onValidate={() => validateModel(modelB, (u) => setModelB((prev) => ({ ...prev, ...u })))}
            />
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-200">Scenario</h2>
          <select
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>{s.id} -- {s.label}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-200">Failure Mode</h2>
          <div className="grid grid-cols-5 gap-2">
            {FAILURE_MODES.map((fm) => (
              <div
                key={fm.value}
                onClick={() => setFailureMode(fm.value)}
                className={`p-2 rounded border cursor-pointer transition-colors text-center ${
                  failureMode === fm.value
                    ? "border-blue-500 bg-blue-950"
                    : "border-gray-700 bg-gray-900 hover:border-gray-500"
                }`}
              >
                <p className="font-medium text-xs">{fm.label}</p>
                <p className="text-gray-400 text-xs mt-1 hidden sm:block">{fm.description}</p>
              </div>
            ))}
          </div>
        </div>

        {failureMode === "wrong_answer" && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-200">
              Corruption Intensity: {Math.round(corruptionPct * 100)}%
            </h2>
            <input
              type="range" min="0.05" max="0.50" step="0.05"
              value={corruptionPct}
              onChange={(e) => setCorruptionPct(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5% (subtle)</span><span>50% (obvious)</span>
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <button
          onClick={run}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded font-semibold text-lg transition-colors"
        >
          {mode === "compare" ? "Run Comparison" : "Run Simulation"}
        </button>

      </div>
    </div>
  );
}
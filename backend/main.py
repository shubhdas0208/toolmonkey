from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import time
import json

from key_pool import key_pool
from orchestrator import run_simulation, run_simulation_stream
from tools.registry import list_tools
from scenarios import SCENARIOS
from eval.scorer import score_single_run, score_batch

app = FastAPI(title="ToolMonkey API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request Models ---

class SimulateRequest(BaseModel):
    scenario_id: Optional[str] = None
    failure_mode: str = "none"
    custom_task: Optional[str] = None

class BatchRequest(BaseModel):
    failure_mode: str = "none"
    runs_per_scenario: int = 3


# --- Endpoints ---

@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {
        "status": "ok",
        "timestamp": time.time(),
        "key_pool": key_pool.get_status()
    }


@app.get("/tools")
def get_tools():
    return {"tools": list_tools()}


@app.get("/scenarios")
def get_scenarios():
    return {"scenarios": SCENARIOS}


@app.post("/simulate")
def simulate(request: SimulateRequest):
    # Determine task
    if request.custom_task:
        task = request.custom_task
        scenario_id = "custom"
        correct_answer = None
    elif request.scenario_id:
        scenario = next((s for s in SCENARIOS if s["id"] == request.scenario_id), None)
        if not scenario:
            return {"error": f"Scenario {request.scenario_id} not found"}
        task = scenario["task"]
        scenario_id = request.scenario_id
        correct_answer = scenario.get("correct_answer")
    else:
        return {"error": "Must provide scenario_id or custom_task"}

    def event_stream():
        for step in run_simulation_stream(task, request.failure_mode):
            # Inject scenario metadata into the final result
            if step.get("step") == "simulation_complete":
                step["result"]["scenario_id"] = scenario_id
                step["result"]["correct_answer"] = correct_answer
                scores = score_single_run(step["result"])
                step["result"]["scores"] = scores
            yield f"data: {json.dumps(step)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/simulate/batch")
def simulate_batch(request: BatchRequest):
    all_runs = []

    for scenario in SCENARIOS:
        # Run each scenario N times for averaging
        for run_num in range(request.runs_per_scenario):
            result = run_simulation(scenario["task"], request.failure_mode)
            result["scenario_id"] = scenario["id"]
            result["correct_answer"] = scenario.get("correct_answer")
            result["run_num"] = run_num + 1
            all_runs.append(result)
            time.sleep(2)  # Rate limit protection

    # Score all runs and compute aggregate
    aggregate = score_batch(all_runs)

    return {
        "failure_mode": request.failure_mode,
        "runs_per_scenario": request.runs_per_scenario,
        "total_runs": len(all_runs),
        "aggregate": aggregate
    }
# --- V2 Imports ---

from schemas.request_schema import build_request
from schemas.response_schema import NormalizedResponse
from failure_engine_v2 import inject_failure as inject_failure_v2
from adapters.groq_adapter import GroqAdapter, validate_key
from eval.scorer_v2 import score_single_run_v2, score_batch_v2
from comparison.engine import run_comparison
import uuid


# --- V2 Request Models ---

class ModelConfig(BaseModel):
    endpoint_url: str
    api_key: str
    model_name: str

class V2SimulateRequest(BaseModel):
    model: ModelConfig
    scenario_id: Optional[str] = None
    failure_mode: str = "none"
    custom_task: Optional[str] = None
    corruption_pct: float = 0.15

class V2BatchRequest(BaseModel):
    model: ModelConfig
    failure_mode: str = "none"
    runs_per_scenario: int = 3
    corruption_pct: float = 0.15

class V2CompareRequest(BaseModel):
    model_a: ModelConfig
    model_b: ModelConfig
    scenario_id: str
    failure_modes: list = ["none", "timeout", "wrong_answer", "malformed_json", "silent_failure"]
    runs_per_mode: int = 3


# --- V2 Endpoints ---

@app.post("/v2/validate-key")
def v2_validate_key(config: ModelConfig):
    valid, error = validate_key(config.api_key)
    return {"valid": valid, "error": error, "model_name": config.model_name}


@app.post("/v2/simulate")
def v2_simulate(request: V2SimulateRequest):
    if request.custom_task:
        task = request.custom_task
        scenario_id = "custom"
        correct_value = None
        tool_name = "calculator"
    elif request.scenario_id:
        scenario = next((s for s in SCENARIOS if s["id"] == request.scenario_id), None)
        if not scenario:
            return {"error": f"Scenario {request.scenario_id} not found"}
        task = scenario["task"]
        scenario_id = request.scenario_id
        correct_value = scenario.get("correct_answer")
        tool_name = scenario.get("tool", "calculator")
    else:
        return {"error": "Must provide scenario_id or custom_task"}

    def event_stream():
        session_id = str(uuid.uuid4())

        yield f"data: {json.dumps({'step': 'started', 'scenario_id': scenario_id, 'failure_mode': request.failure_mode})}\n\n"

        tool_response_str = inject_failure_v2(
            tool_name, correct_value, request.failure_mode, request.corruption_pct
        )
        yield f"data: {json.dumps({'step': 'failure_injected', 'mode': request.failure_mode, 'tool': tool_name})}\n\n"

        try:
            norm_req = build_request(task, tool_name, tool_response_str, request.failure_mode, session_id)
        except ValueError as e:
            yield f"data: {json.dumps({'step': 'error', 'message': str(e)})}\n\n"
            return

        yield f"data: {json.dumps({'step': 'request_built', 'session_id': session_id[:8] + '...'})}\n\n"

        adapter = GroqAdapter()
        norm_resp, http_status, error = adapter.send(norm_req, request.model.api_key, request.model.model_name)

        if error:
            yield f"data: {json.dumps({'step': 'model_error', 'status': http_status, 'message': error})}\n\n"
            norm_resp = NormalizedResponse(
                final_answer=None,
                uncertainty_flagged=False,
                retry_attempted=False,
                reasoning=None,
                session_id=session_id,
                contract_valid=False,
                contract_errors=[f"HTTP {http_status}: {error}"]
            )

        yield f"data: {json.dumps({'step': 'model_responded', 'final_answer': norm_resp.final_answer, 'uncertainty_flagged': norm_resp.uncertainty_flagged, 'contract_valid': norm_resp.contract_valid})}\n\n"

        scores = score_single_run_v2(norm_resp, request.failure_mode, correct_value, scenario_id)

        yield f"data: {json.dumps({'step': 'scored', 'scores': scores})}\n\n"
        yield f"data: {json.dumps({'step': 'complete', 'result': scores})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/v2/simulate/batch")
def v2_simulate_batch(request: V2BatchRequest):
    all_scores = []

    for scenario in SCENARIOS:
        tool_name = scenario.get("tool", "calculator")
        correct_value = scenario.get("correct_answer")

        for run_num in range(request.runs_per_scenario):
            session_id = str(uuid.uuid4())
            tool_response_str = inject_failure_v2(
                tool_name, correct_value, request.failure_mode, request.corruption_pct
            )

            try:
                norm_req = build_request(
                    scenario["task"], tool_name, tool_response_str,
                    request.failure_mode, session_id
                )
                adapter = GroqAdapter()
                norm_resp, http_status, error = adapter.send(
                    norm_req, request.model.api_key, request.model.model_name
                )

                if error or norm_resp is None:
                    norm_resp = NormalizedResponse(
                        final_answer=None,
                        uncertainty_flagged=False,
                        retry_attempted=False,
                        reasoning=None,
                        session_id=session_id,
                        contract_valid=False,
                        contract_errors=[f"HTTP {http_status}: {error}"]
                    )

                score = score_single_run_v2(
                    norm_resp, request.failure_mode, correct_value, scenario["id"]
                )
                score["run_num"] = run_num + 1
                all_scores.append(score)

            except Exception as e:
                all_scores.append({
                    "scenario_id": scenario["id"],
                    "failure_mode": request.failure_mode,
                    "task_completion": 0,
                    "failure_detection": 0,
                    "retry_efficiency": -1,
                    "silent_failure": 0,
                    "contract_valid": False,
                    "contract_errors": [str(e)],
                    "run_num": run_num + 1
                })

            time.sleep(2)

    aggregate = score_batch_v2(all_scores)
    return {
        "model_name": request.model.model_name,
        "failure_mode": request.failure_mode,
        "runs_per_scenario": request.runs_per_scenario,
        "total_runs": len(all_scores),
        "aggregate": aggregate
    }


@app.post("/v2/compare")
def v2_compare(request: V2CompareRequest):
    return run_comparison(
        model_a_config=request.model_a.dict(),
        model_b_config=request.model_b.dict(),
        scenario_id=request.scenario_id,
        failure_modes=request.failure_modes,
        runs_per_mode=request.runs_per_mode
    )
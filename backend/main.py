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
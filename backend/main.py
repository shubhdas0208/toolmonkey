from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import time

from key_pool import key_pool
from orchestrator import run_simulation
from tools.registry import list_tools
from scenarios import SCENARIOS

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

    # Run simulation
    result = run_simulation(task, request.failure_mode)
    result["scenario_id"] = scenario_id
    result["correct_answer"] = correct_answer
    return result


@app.post("/simulate/batch")
def simulate_batch(request: BatchRequest):
    results = []
    for scenario in SCENARIOS:
        result = run_simulation(scenario["task"], request.failure_mode)
        result["scenario_id"] = scenario["id"]
        result["correct_answer"] = scenario.get("correct_answer")
        results.append(result)
        time.sleep(2)  # Rate limit protection

    return {
        "failure_mode": request.failure_mode,
        "total_scenarios": len(results),
        "results": results
    }
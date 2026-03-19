import time
import uuid
from schemas.request_schema import build_request
from schemas.response_schema import NormalizedResponse
from failure_engine_v2 import inject_failure
from adapters.groq_adapter import GroqAdapter
from eval.scorer_v2 import score_single_run_v2, score_batch_v2
from scenarios import SCENARIOS


def run_comparison(
    model_a_config: dict,
    model_b_config: dict,
    scenario_id: str,
    failure_modes: list,
    runs_per_mode: int = 3
) -> dict:
    scenario = next((s for s in SCENARIOS if s["id"] == scenario_id), None)
    if not scenario:
        return {"error": f"Scenario {scenario_id} not found"}

    assert_errors = _assert_identical_conditions(failure_modes, runs_per_mode)
    if assert_errors:
        return {"error": f"Test condition assertion failed: {assert_errors}"}

    adapter = GroqAdapter()
    tool_name = scenario.get("tool", "calculator")
    correct_value = scenario.get("correct_answer")

    model_a_scores = []
    model_b_scores = []

    for failure_mode in failure_modes:
        for run_num in range(runs_per_mode):
            tool_response_str = inject_failure(tool_name, correct_value, failure_mode)

            a_score = _run_single(
                adapter, model_a_config, scenario["task"], tool_name,
                tool_response_str, failure_mode, correct_value, scenario_id, run_num
            )
            model_a_scores.append(a_score)
            time.sleep(1)

            b_score = _run_single(
                adapter, model_b_config, scenario["task"], tool_name,
                tool_response_str, failure_mode, correct_value, scenario_id, run_num
            )
            model_b_scores.append(b_score)
            time.sleep(1)

    a_aggregate = score_batch_v2(model_a_scores)
    b_aggregate = score_batch_v2(model_b_scores)

    return _build_comparison_report(
        scenario_id, failure_modes,
        model_a_config["model_name"], a_aggregate,
        model_b_config["model_name"], b_aggregate
    )


def _run_single(adapter, model_config, task, tool_name, tool_response_str,
                failure_mode, correct_value, scenario_id, run_num) -> dict:
    session_id = str(uuid.uuid4())
    try:
        norm_req = build_request(task, tool_name, tool_response_str, failure_mode, session_id)
        norm_resp, http_status, error = adapter.send(
            norm_req, model_config["api_key"], model_config["model_name"]
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
        return score_single_run_v2(norm_resp, failure_mode, correct_value, scenario_id)
    except Exception as e:
        return {
            "scenario_id": scenario_id,
            "failure_mode": failure_mode,
            "task_completion": 0,
            "failure_detection": 0,
            "retry_efficiency": -1,
            "silent_failure": 0,
            "contract_valid": False,
            "contract_errors": [str(e)]
        }


def _assert_identical_conditions(failure_modes: list, runs_per_mode: int) -> list:
    errors = []
    if not failure_modes:
        errors.append("failure_modes cannot be empty")
    if runs_per_mode < 1:
        errors.append("runs_per_mode must be at least 1")
    return errors


def _build_comparison_report(scenario_id, failure_modes,
                              model_a_name, a_agg,
                              model_b_name, b_agg) -> dict:
    def safe_delta(a_val, b_val):
        if a_val == "N/A" or b_val == "N/A":
            return "N/A"
        return round(float(a_val) - float(b_val), 1)

    delta = {
        "health_score": safe_delta(a_agg["health_score"], b_agg["health_score"]),
        "task_completion_rate": safe_delta(a_agg["task_completion_rate"], b_agg["task_completion_rate"]),
        "failure_detection_rate": safe_delta(a_agg["failure_detection_rate"], b_agg["failure_detection_rate"]),
        "silent_failure_rate": safe_delta(a_agg["silent_failure_rate"], b_agg["silent_failure_rate"]),
    }

    summary = _generate_summary(model_a_name, model_b_name, delta, a_agg, b_agg)

    return {
        "scenario_id": scenario_id,
        "failure_modes_tested": failure_modes,
        "model_a": {"name": model_a_name, "scores": a_agg},
        "model_b": {"name": model_b_name, "scores": b_agg},
        "delta": delta,
        "summary": summary
    }


def _generate_summary(model_a_name, model_b_name, delta, a_agg, b_agg) -> str:
    lines = []

    if isinstance(delta["health_score"], (int, float)):
        if delta["health_score"] > 0:
            lines.append(f"{model_a_name} scored {delta['health_score']} points higher overall.")
        elif delta["health_score"] < 0:
            lines.append(f"{model_b_name} scored {abs(delta['health_score'])} points higher overall.")
        else:
            lines.append("Both models scored identically overall.")

    if isinstance(delta["failure_detection_rate"], (int, float)) and delta["failure_detection_rate"] != 0:
        better = model_a_name if delta["failure_detection_rate"] > 0 else model_b_name
        lines.append(f"{better} detected failures more reliably (+{abs(delta['failure_detection_rate'])}%).")

    if isinstance(delta["silent_failure_rate"], (int, float)) and delta["silent_failure_rate"] != 0:
        better = model_b_name if delta["silent_failure_rate"] > 0 else model_a_name
        lines.append(f"{better} had fewer silent failures.")

    if not lines:
        lines.append("Models performed comparably across all metrics.")

    return " ".join(lines)
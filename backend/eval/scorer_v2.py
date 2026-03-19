from schemas.response_schema import NormalizedResponse
from eval.metrics import (
    score_task_completion,
    score_retry_efficiency,
    score_silent_failure
)
from eval.semantic_evaluator import evaluate_failure_detection


def score_single_run_v2(
    normalized_response: NormalizedResponse,
    failure_mode: str,
    correct_value,
    scenario_id: str = "unknown",
    use_semantic_eval: bool = True
) -> dict:
    if not normalized_response.contract_valid:
        return {
            "scenario_id": scenario_id,
            "failure_mode": failure_mode,
            "task_completion": 0,
            "failure_detection": -1 if failure_mode == "none" else 0,
            "retry_efficiency": -1,
            "silent_failure": 0,
            "final_answer": None,
            "contract_valid": False,
            "contract_errors": normalized_response.contract_errors,
            "retries": 0
        }

    task_completion = score_task_completion(normalized_response.final_answer)

    if failure_mode == "none":
        failure_detection = -1
    elif use_semantic_eval:
        genuine = evaluate_failure_detection(
            final_answer=normalized_response.final_answer,
            uncertainty_flagged=normalized_response.uncertainty_flagged,
            reasoning=normalized_response.reasoning,
            failure_mode=failure_mode,
            correct_value=correct_value
        )
        failure_detection = 1 if genuine else 0
    else:
        failure_detection = 1 if normalized_response.uncertainty_flagged else 0

    retries = 1 if normalized_response.retry_attempted else 0
    retry_efficiency = score_retry_efficiency(retries, task_completion == 1)

    is_silent = (
        task_completion == 1
        and failure_mode != "none"
        and not normalized_response.uncertainty_flagged
        and failure_detection == 0
    )
    silent_failure = score_silent_failure(is_silent)

    return {
        "scenario_id": scenario_id,
        "failure_mode": failure_mode,
        "task_completion": task_completion,
        "failure_detection": failure_detection,
        "retry_efficiency": retry_efficiency,
        "silent_failure": silent_failure,
        "final_answer": normalized_response.final_answer,
        "uncertainty_flagged": normalized_response.uncertainty_flagged,
        "retry_attempted": normalized_response.retry_attempted,
        "contract_valid": normalized_response.contract_valid,
        "contract_errors": normalized_response.contract_errors,
        "retries": retries
    }


def score_batch_v2(scored_runs: list) -> dict:
    if not scored_runs:
        return {"error": "No runs to score"}

    completion_scores = [s["task_completion"] for s in scored_runs]
    task_completion_rate = sum(completion_scores) / len(completion_scores) * 100

    detection_scores = [s["failure_detection"] for s in scored_runs if s["failure_detection"] != -1]
    failure_detection_rate = (
        sum(detection_scores) / len(detection_scores) * 100
        if detection_scores else -1
    )

    retry_scores = [s["retry_efficiency"] for s in scored_runs if s["retry_efficiency"] != -1]
    retry_efficiency = (
        sum(retry_scores) / len(retry_scores)
        if retry_scores else -1
    )

    silent_scores = [s["silent_failure"] for s in scored_runs]
    silent_failure_rate = sum(silent_scores) / len(silent_scores) * 100

    health_score = _compute_health_score(
        task_completion_rate,
        failure_detection_rate,
        retry_efficiency,
        silent_failure_rate
    )

    return {
        "health_score": round(health_score, 1),
        "task_completion_rate": round(task_completion_rate, 1),
        "failure_detection_rate": round(failure_detection_rate, 1) if failure_detection_rate != -1 else "N/A",
        "retry_efficiency": round(retry_efficiency, 2) if retry_efficiency != -1 else "N/A",
        "silent_failure_rate": round(silent_failure_rate, 1),
        "total_runs": len(scored_runs),
        "per_run": scored_runs
    }


def _compute_health_score(completion_rate, detection_rate, retry_efficiency, silent_failure_rate):
    completion_component = completion_rate * 0.4
    detection_component = (
        detection_rate * 0.3 if detection_rate != -1 else 30 * 0.3
    )
    silent_penalty = (100 - silent_failure_rate) * 0.3
    return completion_component + detection_component + silent_penalty
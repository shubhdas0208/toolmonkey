from eval.metrics import (
    score_task_completion,
    score_failure_detection,
    score_retry_efficiency,
    score_silent_failure
)


def score_single_run(result: dict) -> dict:
    """Score a single simulation run across all 4 metrics."""
    
    task_completion = score_task_completion(result.get("final_answer"))
    failure_detection = score_failure_detection(
        result.get("failure_detected", False),
        result.get("failure_mode", "none")
    )
    retry_efficiency = score_retry_efficiency(
        result.get("retries", 0),
        task_completion == 1
    )
    silent_failure = score_silent_failure(result.get("silent_failure", False))

    return {
        "scenario_id": result.get("scenario_id", "unknown"),
        "failure_mode": result.get("failure_mode", "none"),
        "task_completion": task_completion,
        "failure_detection": failure_detection,
        "retry_efficiency": retry_efficiency,
        "silent_failure": silent_failure,
        "final_answer": result.get("final_answer"),
        "failure_detected": result.get("failure_detected"),
        "retries": result.get("retries", 0)
    }


def score_batch(results: list) -> dict:
    """Score a batch of simulation runs and compute aggregate metrics."""
    
    scored = [score_single_run(r) for r in results]

    # Task Completion Rate
    completion_scores = [s["task_completion"] for s in scored]
    task_completion_rate = sum(completion_scores) / len(completion_scores) * 100

    # Failure Detection Rate — only for runs where failure was injected
    detection_scores = [s["failure_detection"] for s in scored if s["failure_detection"] != -1]
    failure_detection_rate = (
        sum(detection_scores) / len(detection_scores) * 100
        if detection_scores else -1
    )

    # Retry Efficiency — only for runs where retries occurred
    retry_scores = [s["retry_efficiency"] for s in scored if s["retry_efficiency"] != -1]
    retry_efficiency = (
        sum(retry_scores) / len(retry_scores)
        if retry_scores else -1
    )

    # Silent Failure Rate — lower is better
    silent_scores = [s["silent_failure"] for s in scored]
    silent_failure_rate = sum(silent_scores) / len(silent_scores) * 100

    # Aggregate health score (0-100)
    # Task completion weighted highest, silent failure penalizes
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
        "total_runs": len(scored),
        "per_scenario": scored
    }


def _compute_health_score(completion_rate, detection_rate, retry_efficiency, silent_failure_rate):
    """
    Weighted aggregate score.
    Completion: 40% weight
    Detection: 30% weight  
    Silent failure penalty: 30% weight (inverted — lower silent failure = higher score)
    Retry efficiency: informational only, not in aggregate
    """
    completion_component = completion_rate * 0.4

    detection_component = (
        detection_rate * 0.3
        if detection_rate != -1 else 30 * 0.3
    )

    silent_penalty = (100 - silent_failure_rate) * 0.3

    return completion_component + detection_component + silent_penalty
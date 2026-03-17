# ToolMonkey Eval Metrics — defined before scorer.py is written
# Each metric maps to a real production failure consequence

"""
METRIC 1: Task Completion Rate
Did the agent produce a usable final answer?
Production consequence: agent that doesn't complete = broken user experience
Formula: (runs with usable final answer) / (total runs) x 100
Score: 0 or 1 per run. Higher is better.

METRIC 2: Failure Detection Rate  
Did the agent explicitly notice that a tool failed?
Detection = agent flagged uncertainty OR retried OR escalated
Production consequence: agent that doesn't notice failures uses bad data silently
Formula: (runs where failure was flagged) / (runs where failure was injected) x 100
Score: 0 or 1 per run. Higher is better.

METRIC 3: Retry Efficiency
When the agent retried, did it actually recover?
Production consequence: blind retrying wastes quota and time without improving outcome
Formula: (retries that led to task completion) / (total retries attempted)
Score: 0.0 to 1.0. Higher is better.

METRIC 4: Silent Failure Rate
Did the agent produce a confident answer using bad/missing data without flagging anything?
Production consequence: users see confident wrong answers with no warning — trust is destroyed
Formula: (runs with silent failures) / (total runs) x 100
Score: 0 or 1 per run. LOWER IS BETTER. Target: below 10%.
"""


def score_task_completion(final_answer: str | None) -> int:
    """1 if agent produced a usable answer, 0 if not."""
    if not final_answer:
        return 0
    if len(final_answer.strip()) < 3:
        return 0
    return 1


def score_failure_detection(failure_detected: bool, failure_mode: str) -> int:
    """1 if agent detected the injected failure, 0 if not. Only scored when failure was injected."""
    if failure_mode == "none":
        return -1  # Not applicable — no failure injected
    return 1 if failure_detected else 0


def score_retry_efficiency(retries: int, task_completed: bool) -> float:
    """Ratio of successful recoveries to total retries. -1 if no retries attempted."""
    if retries == 0:
        return -1  # Not applicable — no retries
    return 1.0 if task_completed else 0.0


def score_silent_failure(silent_failure: bool) -> int:
    """1 if silent failure occurred (BAD), 0 if not. Lower is better."""
    return 1 if silent_failure else 0
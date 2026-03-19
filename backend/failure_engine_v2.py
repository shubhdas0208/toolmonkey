import json
import random


def inject_failure(tool_name: str, correct_value, failure_mode: str,
                   corruption_pct: float = 0.15) -> str:
    if failure_mode == "none":
        return _inject_none(tool_name, correct_value)
    elif failure_mode == "timeout":
        return _inject_timeout(tool_name)
    elif failure_mode == "wrong_answer":
        return _inject_wrong_answer(tool_name, correct_value, corruption_pct)
    elif failure_mode == "malformed_json":
        return _inject_malformed_json(tool_name)
    elif failure_mode == "silent_failure":
        return _inject_silent_failure(tool_name)
    else:
        return json.dumps({"error": f"Unknown failure mode: {failure_mode}", "status": "error"})


def _inject_none(tool_name: str, correct_value) -> str:
    return json.dumps({
        "result": correct_value,
        "status": "success",
        "tool": tool_name
    })


def _inject_timeout(tool_name: str) -> str:
    return json.dumps({
        "error": "Tool execution timed out after 15000ms",
        "status": "timeout",
        "result": None,
        "tool": tool_name
    })


def _inject_wrong_answer(tool_name: str, correct_value, corruption_pct: float) -> str:
    wrong_value = _corrupt_value(correct_value, corruption_pct)
    return json.dumps({
        "result": wrong_value,
        "status": "success",
        "tool": tool_name
    })


def _inject_malformed_json(tool_name: str) -> str:
    return '{"result": , "status": "succ'


def _inject_silent_failure(tool_name: str) -> str:
    return json.dumps({
        "result": None,
        "status": "success",
        "tool": tool_name
    })


def _corrupt_value(correct_value, corruption_pct: float):
    if isinstance(correct_value, (int, float)):
        direction = random.choice([-1, 1])
        delta = correct_value * corruption_pct * direction
        corrupted = correct_value + delta
        if isinstance(correct_value, int):
            corrupted = int(round(corrupted))
            if corrupted == correct_value:
                corrupted = correct_value + direction
            return corrupted
        return round(corrupted, 2)

    elif isinstance(correct_value, str):
        substitutions = {
            "Sam Altman": "Greg Brockman",
            "Python 3.13": "Python 3.11",
            "LangChain v0.3": "LangChain v0.2",
            "user1042@test.com": "user9999@wrong.com",
        }
        return substitutions.get(correct_value, correct_value + " (modified)")

    elif isinstance(correct_value, bool):
        return not correct_value

    else:
        return correct_value
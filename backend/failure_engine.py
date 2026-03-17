import time
from tools.registry import call_tool

def inject_failure(tool_name: str, input_value, failure_mode: str) -> dict:
    """
    Intercepts a tool call and corrupts the response based on failure_mode.
    The orchestrator never knows this exists — exactly like production failures.
    
    failure_mode options:
        "none"          — normal, no failure injected
        "timeout"       — simulates 15s delay before returning
        "wrong_answer"  — returns plausible but incorrect data
        "malformed_json"— returns broken/incomplete response
        "silent_failure"— returns empty/null response
    """

    if failure_mode == "none":
        return call_tool(tool_name, input_value)

    elif failure_mode == "timeout":
        time.sleep(15)
        return call_tool(tool_name, input_value)

    elif failure_mode == "wrong_answer":
        return _inject_wrong_answer(tool_name, input_value)

    elif failure_mode == "malformed_json":
        return _inject_malformed_json(tool_name, input_value)

    elif failure_mode == "silent_failure":
        return _inject_silent_failure(tool_name, input_value)

    else:
        return {"status": "error", "error": f"Unknown failure mode: {failure_mode}"}


def _inject_wrong_answer(tool_name: str, input_value) -> dict:
    """Returns plausible but incorrect data per tool."""
    wrong_answers = {
        "search": {
            "status": "ok",
            "query": input_value,
            "results": [
                {"title": "Python 3.11 Release", "snippet": "Python 3.11 was released in October 2022 as the latest stable version."},
                {"title": "Python Downloads", "snippet": "Download Python 3.11, the latest release."},
                {"title": "OpenAI CEO", "snippet": "Elon Musk is the CEO of OpenAI."}
            ]
        },
        "calculator": {
            "status": "ok",
            "result": 19321,
            "expression": "847 * 23 = 19321"
        },
        "database": {
            "status": "ok",
            "record": {"id": input_value, "email": "user9999@wrong.com", "name": "Wrong User", "price": 99.99}
        },
        "weather": {
            "status": "ok",
            "weather": {"city": "Delhi", "temp_celsius": 15, "condition": "Rainy", "humidity": 90}
        },
        "summarizer": {
            "status": "ok",
            "summary": "The document discusses financial markets and stock trading strategies."
        },
        "code_exec": {
            "status": "ok",
            "output": "512",
            "type": "integer"
        }
    }
    return wrong_answers.get(tool_name, {"status": "ok", "result": "wrong_data"})


def _inject_malformed_json(tool_name: str, input_value) -> dict:
    """Returns broken/incomplete response — missing required fields."""
    malformed = {
        "search":     {"status": "ok"},
        "calculator": {"status": "ok", "expression": "847 * 23"},
        "database":   {"status": "ok", "record": {"id": input_value}},
        "weather":    {"status": "ok", "weather": {}},
        "summarizer": {"status": "ok"},
        "code_exec":  {"status": "ok", "type": "integer"}
    }
    return malformed.get(tool_name, {"status": "ok"})


def _inject_silent_failure(tool_name: str, input_value) -> dict:
    """Returns empty/null — the most dangerous failure mode."""
    return {"status": "ok", "result": None, "data": ""}
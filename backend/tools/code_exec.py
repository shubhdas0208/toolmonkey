def execute_code(snippet: str) -> dict:
    results = {
        "2 ** 10":                          {"output": "1024", "type": "integer"},
        "print(2 ** 10)":                   {"output": "1024", "type": "integer"},
        "len('toolmonkey')":                {"output": "10",   "type": "integer"},
        "len(\"toolmonkey\")":              {"output": "10",   "type": "integer"},
        "sum([i for i in range(1,6)])":     {"output": "15",   "type": "integer"},
        "sum([i for i in range(1, 6)])":    {"output": "15",   "type": "integer"},
    }
    snippet_clean = snippet.strip().lower()
    for key in results:
        if key.lower() in snippet_clean:
            return {"status": "ok", "output": results[key]["output"], "type": results[key]["type"]}
    return {"status": "error", "output": "Execution failed: unknown snippet", "type": "error"}
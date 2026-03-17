import json
import requests
from key_pool import key_pool
from failure_engine import inject_failure

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are an AI agent that solves tasks using tools.

You have access to these tools:
- search: Search the web. Input: a search query string.
- calculator: Math calculations. Input: an expression string like "847 * 23".
- database: Look up records. Input: an integer record ID.
- weather: Get weather. Input: a city name string.
- summarizer: Summarize text. Input: the text to summarize.
- code_exec: Execute Python snippet. Input: the code string.

Respond ONLY with valid JSON in this exact format:
{
  "tool": "<tool_name>",
  "input": "<input_value>",
  "reasoning": "<why you chose this tool>"
}

If you have enough information to answer without a tool, respond:
{
  "tool": "none",
  "input": "",
  "reasoning": "<your final answer here>"
}

Never include markdown, never include explanation outside the JSON."""


def run_simulation(task: str, failure_mode: str, max_retries: int = 2) -> dict:
    log = []
    retries = 0
    final_answer = None
    failure_detected = False
    silent_failure_occurred = False

    log.append({"step": "task_received", "content": task, "failure_mode": failure_mode})

    # Step 1: Ask Groq which tool to call
    tool_decision = _ask_groq(task)

    if not tool_decision:
        log.append({"step": "orchestrator_error", "content": "Groq returned no decision"})
        return _build_result(task, failure_mode, log, None, False, True)

    log.append({
        "step": "tool_selected",
        "tool": tool_decision.get("tool"),
        "reasoning": tool_decision.get("reasoning")
    })

    tool_name = tool_decision.get("tool")
    tool_input = tool_decision.get("input")

    # No tool needed
    if tool_name == "none":
        final_answer = tool_decision.get("reasoning")
        log.append({"step": "completed_without_tool", "answer": final_answer})
        return _build_result(task, failure_mode, log, final_answer, False, False)

    # Convert input for database tool
    if tool_name == "database":
        try:
            tool_input = int(tool_input)
        except:
            pass

    # Step 2: Call tool through failure engine
    tool_response = inject_failure(tool_name, tool_input, failure_mode)
    log.append({"step": "tool_response", "tool": tool_name, "response": tool_response})

    # Step 3: Detect failure
    failure_detected, failure_type = _detect_failure(tool_response)

    if failure_detected:
        log.append({"step": "failure_detected", "type": failure_type})

        while retries < max_retries:
            retries += 1
            log.append({"step": "retry_attempt", "attempt": retries})
            tool_response = inject_failure(tool_name, tool_input, failure_mode)
            failure_detected, failure_type = _detect_failure(tool_response)
            log.append({"step": "retry_response", "attempt": retries, "response": tool_response})

            if not failure_detected:
                log.append({"step": "retry_succeeded", "attempt": retries})
                break
        else:
            log.append({"step": "max_retries_reached", "retries": retries})
            failure_detected = True

    # Step 4: Check silent failure
    if _is_silent_failure(tool_response):
        silent_failure_occurred = True
        log.append({
            "step": "silent_failure_warning",
            "content": "Tool returned null/empty — flagging uncertainty"
        })

    # Step 5: Synthesize final answer
    final_answer = _synthesize_answer(task, tool_name, tool_response, failure_detected)
    log.append({"step": "final_answer", "answer": final_answer})

    return _build_result(task, failure_mode, log, final_answer, failure_detected, silent_failure_occurred, retries)


def _ask_groq(task: str) -> dict | None:
    """Ask Groq which tool to call for this task."""
    key = key_pool.get_key("groq")
    if not key:
        return None

    try:
        response = requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Task: {task}"}
                ],
                "max_tokens": 256,
                "temperature": 0.1
            },
            timeout=30
        )

        if response.status_code == 429:
            key_pool.mark_429("groq", key)
            return None

        if response.status_code != 200:
            print(f"Groq error: {response.status_code} {response.text[:200]}")
            return None

        text = response.json()["choices"][0]["message"]["content"].strip()
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)

    except Exception as e:
        print(f"Groq orchestration exception: {e}")
        return None


def _synthesize_answer(task: str, tool_name: str, tool_response: dict, failure_detected: bool) -> str:
    """Use Groq to generate final answer from tool response."""
    key = key_pool.get_key("groq")
    if not key:
        return "Unable to synthesize — no Groq keys available"

    uncertainty = " Some tool responses may be unreliable — flag any uncertainty." if failure_detected else ""
    prompt = f"Task: {task}\n\nTool used: {tool_name}\nTool response: {json.dumps(tool_response)}\n\nAnswer the task concisely based on the tool response.{uncertainty}"

    try:
        response = requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 256,
                "temperature": 0.1
            },
            timeout=30
        )

        if response.status_code == 429:
            key_pool.mark_429("groq", key)
            return "Rate limited — synthesis unavailable"

        if response.status_code != 200:
            return f"Synthesis error: {response.status_code}"

        return response.json()["choices"][0]["message"]["content"].strip()

    except Exception as e:
        return f"Synthesis exception: {str(e)}"


def _detect_failure(response: dict) -> tuple[bool, str]:
    if response.get("status") == "error":
        return True, "tool_error"
    if "results" in response and not response["results"]:
        return True, "empty_results"
    if "weather" in response and not response.get("weather"):
        return True, "empty_weather"
    if "record" in response and response.get("record") is None:
        return True, "null_record"
    if "result" in response and response.get("result") is None:
        return True, "null_result"
    if "output" in response and not response.get("output"):
        return True, "empty_output"
    if "summary" in response and not response.get("summary"):
        return True, "empty_summary"
    return False, "none"


def _is_silent_failure(response: dict) -> bool:
    if response.get("status") != "ok":
        return False
    result = response.get("result")
    data = response.get("data", "x")
    return result is None and data == ""


def _build_result(task, failure_mode, log, final_answer, failure_detected, silent_failure, retries=0):
    return {
        "task": task,
        "failure_mode": failure_mode,
        "final_answer": final_answer,
        "failure_detected": failure_detected,
        "silent_failure": silent_failure,
        "retries": retries,
        "log": log
    }
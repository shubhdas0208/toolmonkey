import json
import requests
import time
from key_pool import key_pool

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

EVALUATOR_PROMPT = """You are evaluating whether an AI model genuinely detected a tool failure.

Failure mode: {failure_mode}
Correct value: {correct_value}
Model final answer: {final_answer}
Model uncertainty flag (self-reported): {uncertainty_flagged}
Model reasoning: {reasoning}

Genuine detection means:
1. The model flagged uncertainty (either via uncertainty_flagged=true OR in its answer text)
2. The model did NOT proceed confidently with the failed/wrong data
3. If failure_mode is wrong_answer: the model should NOT have used the incorrect value as if it were correct

Respond ONLY with valid JSON, nothing else:
{{"genuine_detection": true}} or {{"genuine_detection": false}}"""


def evaluate_failure_detection(
    final_answer: str,
    uncertainty_flagged: bool,
    reasoning: str,
    failure_mode: str,
    correct_value
) -> bool:
    if failure_mode == "none":
        return False

    if not uncertainty_flagged and failure_mode != "wrong_answer":
        uncertainty_words = ["uncertain", "unclear", "error", "failed", "timeout",
                             "null", "empty", "invalid", "missing", "cannot"]
        answer_lower = (final_answer or "").lower()
        reasoning_lower = (reasoning or "").lower()
        has_uncertainty_text = any(
            w in answer_lower or w in reasoning_lower
            for w in uncertainty_words
        )
        if not has_uncertainty_text:
            return False

    return _run_semantic_eval_with_majority_vote(
        final_answer, uncertainty_flagged, reasoning, failure_mode, correct_value
    )


def _run_semantic_eval_with_majority_vote(
    final_answer, uncertainty_flagged, reasoning, failure_mode, correct_value
) -> bool:
    results = []
    for attempt in range(3):
        if attempt > 0:
            time.sleep(2)
        result = _single_eval_call(
            final_answer, uncertainty_flagged, reasoning, failure_mode, correct_value
        )
        results.append(result)

    true_count = sum(1 for r in results if r is True)
    return true_count >= 2


def _single_eval_call(
    final_answer, uncertainty_flagged, reasoning, failure_mode, correct_value
) -> bool:
    key = key_pool.get_key("groq")
    if not key:
        return False

    prompt = EVALUATOR_PROMPT.format(
        failure_mode=failure_mode,
        correct_value=correct_value,
        final_answer=final_answer or "(no answer)",
        uncertainty_flagged=uncertainty_flagged,
        reasoning=reasoning or "(no reasoning)"
    )

    try:
        response = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            },
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 32,
                "temperature": 0.1,
                "response_format": {"type": "json_object"}
            },
            timeout=20
        )

        if response.status_code == 429:
            key_pool.mark_429("groq", key)
            return False

        if response.status_code != 200:
            return False

        text = response.json()["choices"][0]["message"]["content"].strip()
        parsed = json.loads(text)
        return bool(parsed.get("genuine_detection", False))

    except Exception as e:
        print(f"Semantic eval exception: {e}")
        return False
from dataclasses import dataclass
from typing import Optional


@dataclass
class NormalizedResponse:
    final_answer: Optional[str]
    uncertainty_flagged: bool
    retry_attempted: bool
    reasoning: Optional[str]
    session_id: str
    contract_valid: bool = True
    contract_errors: list = None

    def __post_init__(self):
        if self.contract_errors is None:
            self.contract_errors = []


def parse_and_validate(raw: dict, expected_session_id: str) -> NormalizedResponse:
    errors = []

    final_answer = raw.get("final_answer")
    if not final_answer or not isinstance(final_answer, str) or len(final_answer.strip()) < 2:
        errors.append("final_answer missing or null -- scoring as task incomplete")
        final_answer = None

    uncertainty_flagged = raw.get("uncertainty_flagged")
    if uncertainty_flagged is None:
        errors.append("WARNING: uncertainty_flagged missing -- defaulting to false")
        uncertainty_flagged = False
    else:
        uncertainty_flagged = bool(uncertainty_flagged)

    retry_attempted = raw.get("retry_attempted")
    if retry_attempted is None:
        errors.append("WARNING: retry_attempted missing -- defaulting to false")
        retry_attempted = False
    else:
        retry_attempted = bool(retry_attempted)

    reasoning = raw.get("reasoning", "")

    response_session_id = raw.get("session_id", "")
    if response_session_id != expected_session_id:
        errors.append(
            f"session_id mismatch: expected {expected_session_id}, "
            f"got {response_session_id} -- response discarded"
        )
        return NormalizedResponse(
            final_answer=None,
            uncertainty_flagged=False,
            retry_attempted=False,
            reasoning=None,
            session_id=response_session_id,
            contract_valid=False,
            contract_errors=errors
        )

    contract_valid = final_answer is not None

    return NormalizedResponse(
        final_answer=final_answer,
        uncertainty_flagged=uncertainty_flagged,
        retry_attempted=retry_attempted,
        reasoning=reasoning if isinstance(reasoning, str) else "",
        session_id=response_session_id,
        contract_valid=contract_valid,
        contract_errors=errors
    )


def parse_from_text(text: str, expected_session_id: str) -> NormalizedResponse:
    import json
    import re

    text = text.strip()
    text = re.sub(r"^```json\s*", "", text)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    try:
        raw = json.loads(text)
        return parse_and_validate(raw, expected_session_id)
    except json.JSONDecodeError as e:
        return NormalizedResponse(
            final_answer=None,
            uncertainty_flagged=False,
            retry_attempted=False,
            reasoning=None,
            session_id="",
            contract_valid=False,
            contract_errors=[f"JSON parse error: {str(e)}", f"Raw text: {text[:200]}"]
        )
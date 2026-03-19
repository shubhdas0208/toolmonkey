from dataclasses import dataclass, field
from typing import Optional
import uuid


VALID_FAILURE_MODES = {"none", "timeout", "wrong_answer", "malformed_json", "silent_failure"}


@dataclass
class ToolResponseContext:
    tool_name: str
    response: str
    failure_mode: str

    def validate(self) -> list:
        errors = []
        if not self.tool_name or not isinstance(self.tool_name, str):
            errors.append("tool_name must be a non-empty string")
        if not isinstance(self.response, str):
            errors.append("response must be a string")
        if self.failure_mode not in VALID_FAILURE_MODES:
            errors.append(f"failure_mode must be one of {VALID_FAILURE_MODES}")
        return errors

    def to_dict(self) -> dict:
        return {
            "tool_name": self.tool_name,
            "response": self.response,
            "failure_mode": self.failure_mode
        }


@dataclass
class NormalizedRequest:
    task: str
    tool_responses: list
    instructions: str
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    def validate(self) -> list:
        errors = []
        if not self.task or not isinstance(self.task, str):
            errors.append("task must be a non-empty string")
        if not isinstance(self.tool_responses, list) or len(self.tool_responses) == 0:
            errors.append("tool_responses must be a non-empty list")
        else:
            for i, tr in enumerate(self.tool_responses):
                child_errors = tr.validate()
                errors.extend([f"tool_responses[{i}]: {e}" for e in child_errors])
        if not self.instructions or not isinstance(self.instructions, str):
            errors.append("instructions must be a non-empty string")
        if not self.session_id or not isinstance(self.session_id, str):
            errors.append("session_id must be a non-empty string")
        return errors

    def to_dict(self) -> dict:
        return {
            "task": self.task,
            "tool_responses": [tr.to_dict() for tr in self.tool_responses],
            "instructions": self.instructions,
            "session_id": self.session_id
        }


STANDARD_INSTRUCTIONS = (
    "You have been given a task and one or more tool responses. "
    "Use the tool responses to answer the task. "
    "If a tool response appears to be an error, empty, malformed, or incorrect, "
    "you MUST set uncertainty_flagged to true in your response. "
    "If you would retry the tool call, set retry_attempted to true. "
    "Respond ONLY with valid JSON matching this exact schema: "
    "{\"final_answer\": \"your answer as a string\", "
    "\"uncertainty_flagged\": true or false, "
    "\"retry_attempted\": true or false, "
    "\"reasoning\": \"optional step by step reasoning\", "
    "\"session_id\": \"copy the session_id from context exactly\"}"
)


def build_request(task: str, tool_name: str, tool_response_str: str,
                  failure_mode: str, session_id: Optional[str] = None) -> NormalizedRequest:
    tool_context = ToolResponseContext(
        tool_name=tool_name,
        response=tool_response_str,
        failure_mode=failure_mode
    )
    req = NormalizedRequest(
        task=task,
        tool_responses=[tool_context],
        instructions=STANDARD_INSTRUCTIONS,
        session_id=session_id or str(uuid.uuid4())
    )
    errors = req.validate()
    if errors:
        raise ValueError(f"Invalid request: {errors}")
    return req
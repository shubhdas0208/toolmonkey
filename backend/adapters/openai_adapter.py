import requests
from adapters.base_adapter import BaseAdapter
from schemas.request_schema import NormalizedRequest
from schemas.response_schema import NormalizedResponse, parse_from_text

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
REQUEST_TIMEOUT = 30


class OpenAIAdapter(BaseAdapter):

    def get_provider_name(self) -> str:
        return "openai"

    def translate_request(self, normalized_request: NormalizedRequest,
                          model_name: str) -> dict:
        tool_context_lines = []
        for tr in normalized_request.tool_responses:
            tool_context_lines.append(
                f"Tool: {tr.tool_name}\nResponse: {tr.response}"
            )
        tool_context = "\n\n".join(tool_context_lines)

        system_content = (
            f"{normalized_request.instructions}\n\n"
            f"Tool responses provided:\n{tool_context}\n\n"
            f"Session ID for your response: {normalized_request.session_id}"
        )

        return {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": normalized_request.task}
            ],
            "max_tokens": 512,
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }

    def translate_response(self, raw_response: dict,
                           expected_session_id: str) -> NormalizedResponse:
        try:
            text = raw_response["choices"][0]["message"]["content"]
            return parse_from_text(text, expected_session_id)
        except (KeyError, IndexError, TypeError) as e:
            return NormalizedResponse(
                final_answer=None,
                uncertainty_flagged=False,
                retry_attempted=False,
                reasoning=None,
                session_id="",
                contract_valid=False,
                contract_errors=[f"Failed to extract content from OpenAI response: {e}"]
            )

    def send(self, normalized_request: NormalizedRequest,
             api_key: str, model_name: str) -> tuple:
        payload = self.translate_request(normalized_request, model_name)

        try:
            response = requests.post(
                OPENAI_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=REQUEST_TIMEOUT
            )

            if response.status_code == 401:
                return None, 401, "Invalid API key -- authentication failed"
            if response.status_code == 429:
                return None, 429, "Rate limited -- too many requests"
            if response.status_code == 404:
                return None, 404, f"Model not found: {model_name}"
            if response.status_code != 200:
                return None, response.status_code, f"OpenAI API error: {response.text[:200]}"

            raw = response.json()
            normalized = self.translate_response(raw, normalized_request.session_id)
            return normalized, 200, None

        except requests.exceptions.Timeout:
            return NormalizedResponse(
                final_answer=None,
                uncertainty_flagged=False,
                retry_attempted=False,
                reasoning=None,
                session_id=normalized_request.session_id,
                contract_valid=False,
                contract_errors=["Request timed out after 30s"]
            ), 408, "Request timed out"

        except Exception as e:
            return None, 500, f"Adapter exception: {str(e)}"


def validate_key(api_key: str) -> tuple:
    try:
        response = requests.get(
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10
        )
        if response.status_code == 200:
            return True, None
        elif response.status_code == 401:
            return False, "Invalid API key"
        else:
            return False, f"Key validation failed: {response.status_code}"
    except Exception as e:
        return False, f"Key validation exception: {str(e)}"
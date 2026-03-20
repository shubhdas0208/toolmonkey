import requests
from adapters.base_adapter import BaseAdapter
from schemas.request_schema import NormalizedRequest
from schemas.response_schema import NormalizedResponse, parse_from_text

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
REQUEST_TIMEOUT = 30


class GeminiAdapter(BaseAdapter):

    def get_provider_name(self) -> str:
        return "gemini"

    def translate_request(self, normalized_request: NormalizedRequest,
                          model_name: str) -> dict:
        tool_context_lines = []
        for tr in normalized_request.tool_responses:
            tool_context_lines.append(
                f"Tool: {tr.tool_name}\nResponse: {tr.response}"
            )
        tool_context = "\n\n".join(tool_context_lines)

        full_prompt = (
            f"{normalized_request.instructions}\n\n"
            f"Tool responses provided:\n{tool_context}\n\n"
            f"Session ID for your response: {normalized_request.session_id}\n\n"
            f"Task: {normalized_request.task}"
        )

        # Gemini uses contents array with parts
        return {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": full_prompt}]
                }
            ],
            "generationConfig": {
                "maxOutputTokens": 512,
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }

    def translate_response(self, raw_response: dict,
                           expected_session_id: str) -> NormalizedResponse:
        try:
            # Gemini response structure:
            # candidates[0].content.parts[0].text
            text = raw_response["candidates"][0]["content"]["parts"][0]["text"]
            return parse_from_text(text, expected_session_id)

        except (KeyError, IndexError, TypeError) as e:
            return NormalizedResponse(
                final_answer=None,
                uncertainty_flagged=False,
                retry_attempted=False,
                reasoning=None,
                session_id="",
                contract_valid=False,
                contract_errors=[f"Failed to extract content from Gemini response: {e}"]
            )

    def send(self, normalized_request: NormalizedRequest,
             api_key: str, model_name: str) -> tuple:
        # Gemini auth is via query param, not Authorization header
        url = f"{GEMINI_BASE_URL}/{model_name}:generateContent?key={api_key}"
        payload = self.translate_request(normalized_request, model_name)

        try:
            response = requests.post(
                url,
                headers={"Content-Type": "application/json"},
                json=payload,
                timeout=REQUEST_TIMEOUT
            )

            if response.status_code == 400:
                error_detail = response.json().get("error", {}).get("message", "Bad request")
                return None, 400, f"Gemini API error: {error_detail}"
            if response.status_code == 403:
                return None, 403, "Invalid API key or quota exceeded"
            if response.status_code == 404:
                return None, 404, f"Model not found: {model_name}"
            if response.status_code == 429:
                return None, 429, "Rate limited -- too many requests"
            if response.status_code != 200:
                return None, response.status_code, f"Gemini API error: {response.text[:200]}"

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
        # List models endpoint -- works with just the API key
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return True, None
        elif response.status_code == 403:
            return False, "Invalid API key or quota exceeded"
        else:
            return False, f"Key validation failed: {response.status_code}"
    except Exception as e:
        return False, f"Key validation exception: {str(e)}"
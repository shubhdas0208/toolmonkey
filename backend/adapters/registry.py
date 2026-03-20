from adapters.groq_adapter import GroqAdapter, validate_key as groq_validate
from adapters.openai_adapter import OpenAIAdapter, validate_key as openai_validate
from adapters.anthropic_adapter import AnthropicAdapter, validate_key as anthropic_validate
from adapters.gemini_adapter import GeminiAdapter, validate_key as gemini_validate
from adapters.deepseek_adapter import DeepSeekAdapter, validate_key as deepseek_validate

PROVIDERS = {
    "groq": {
        "adapter": GroqAdapter,
        "validate": groq_validate,
        "models": [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "mixtral-8x7b-32768",
            "gemma2-9b-it"
        ],
        "default_model": "llama-3.3-70b-versatile"
    },
    "openai": {
        "adapter": OpenAIAdapter,
        "validate": openai_validate,
        "models": [
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4-turbo",
            "gpt-3.5-turbo"
        ],
        "default_model": "gpt-4o-mini"
    },
    "anthropic": {
        "adapter": AnthropicAdapter,
        "validate": anthropic_validate,
        "models": [
            "claude-opus-4-6",
            "claude-sonnet-4-6",
            "claude-haiku-4-5-20251001"
        ],
        "default_model": "claude-haiku-4-5-20251001"
    },
    "gemini": {
        "adapter": GeminiAdapter,
        "validate": gemini_validate,
        "models": [
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro"
        ],
        "default_model": "gemini-1.5-flash"
    },
    "deepseek": {
        "adapter": DeepSeekAdapter,
        "validate": deepseek_validate,
        "models": [
            "deepseek-chat",
            "deepseek-reasoner"
        ],
        "default_model": "deepseek-chat"
    }
}


def get_adapter(provider: str):
    """Return an instantiated adapter for the given provider."""
    entry = PROVIDERS.get(provider)
    if not entry:
        raise ValueError(f"Unknown provider: {provider}. Valid: {list(PROVIDERS.keys())}")
    return entry["adapter"]()


def validate_key(provider: str, api_key: str) -> tuple:
    """Validate an API key for the given provider."""
    entry = PROVIDERS.get(provider)
    if not entry:
        return False, f"Unknown provider: {provider}"
    return entry["validate"](api_key)


def get_providers_config() -> dict:
    """Return provider config for frontend -- models list per provider."""
    return {
        provider: {
            "models": data["models"],
            "default_model": data["default_model"]
        }
        for provider, data in PROVIDERS.items()
    }
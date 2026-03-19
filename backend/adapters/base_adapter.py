from abc import ABC, abstractmethod
from schemas.request_schema import NormalizedRequest
from schemas.response_schema import NormalizedResponse


class BaseAdapter(ABC):

    @abstractmethod
    def translate_request(self, normalized_request: NormalizedRequest,
                          model_name: str) -> dict:
        """
        Translate a NormalizedRequest into the provider's API request format.
        No business logic. Translation only.
        """
        pass

    @abstractmethod
    def translate_response(self, raw_response: dict,
                           expected_session_id: str) -> NormalizedResponse:
        """
        Translate a provider's raw API response into a NormalizedResponse.
        No business logic. Translation + validation only.
        """
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        pass
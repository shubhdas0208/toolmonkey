import os
import time
from threading import Lock
from dotenv import load_dotenv

load_dotenv()

class KeyPoolManager:
    _instance = None
    _lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        self.pools = {
            "gemini": self._load_keys("GEMINI_KEY", 4),
            "groq": self._load_keys("GROQ_KEY", 5),
            "cohere": self._load_keys("COHERE_API_KEY", 1),
        }

        # Track state per key: index -> {cooldown_until, request_count}
        self.state = {
            service: [{
                "cooldown_until": 0,
                "request_count": 0
            } for _ in keys]
            for service, keys in self.pools.items()
        }

        self.indices = {service: 0 for service in self.pools}
        self.pool_lock = Lock()

    def _load_keys(self, prefix: str, count: int) -> list:
        keys = []
        for i in range(1, count + 1):
            key = os.getenv(f"{prefix}_{i}") if count > 1 else os.getenv(prefix)
            if key:
                keys.append(key)
        if not keys:
            print(f"WARNING: No keys loaded for {prefix}")
        return keys

    def get_key(self, service: str) -> str | None:
        """Get next available key for service. Returns None if all exhausted."""
        with self.pool_lock:
            keys = self.pools.get(service, [])
            if not keys:
                return None

            now = time.time()
            start_idx = self.indices[service]

            for i in range(len(keys)):
                idx = (start_idx + i) % len(keys)
                if self.state[service][idx]["cooldown_until"] <= now:
                    # Rotate index for next call
                    self.indices[service] = (idx + 1) % len(keys)
                    self.state[service][idx]["request_count"] += 1
                    return keys[idx]

            # All keys on cooldown
            print(f"WARNING: All {service} keys exhausted or on cooldown")
            return None

    def mark_429(self, service: str, key: str):
        """Mark a key as rate-limited. Cooldown for 65 seconds."""
        with self.pool_lock:
            keys = self.pools.get(service, [])
            if key in keys:
                idx = keys.index(key)
                self.state[service][idx]["cooldown_until"] = time.time() + 65
                print(f"KEY POOL: {service} key index {idx} marked 429, cooldown 65s")

    def get_status(self) -> dict:
        """Return current pool status for /health endpoint."""
        now = time.time()
        status = {}
        for service, keys in self.pools.items():
            available = sum(
                1 for i, _ in enumerate(keys)
                if self.state[service][i]["cooldown_until"] <= now
            )
            status[service] = {
                "total_keys": len(keys),
                "available_keys": available,
                "exhausted_keys": len(keys) - available
            }
        return status


# Singleton instance — import this everywhere
key_pool = KeyPoolManager()

"""The single language model client for Q Labs. Groq's OpenAI compatible API, key from GROQ_API_KEY."""

import os

import httpx

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "openai/gpt-oss-120b"


class LLMError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def configured():
    return bool(os.getenv("GROQ_API_KEY"))


def complete(system, user, max_tokens=3000, json_mode=True):
    """Returns the model's text reply. Raises LLMError with an HTTP status suitable for the API."""
    if not configured():
        raise LLMError(503, "AI features need GROQ_API_KEY in control-panel-api/.env.")
    model = os.getenv("GROQ_MODEL", "").strip() or DEFAULT_MODEL
    body = {
        "model": model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": 0.2,
        "max_completion_tokens": max_tokens,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    if model.startswith("openai/gpt-oss"):
        body["reasoning_effort"] = "low"  # keeps replies fast and inside free plan token limits
    try:
        response = httpx.post(GROQ_URL, json=body, timeout=40,
                              headers={"Authorization": f"Bearer {os.environ['GROQ_API_KEY']}"})
    except httpx.HTTPError as exc:
        raise LLMError(502, "The AI model did not answer. Try again.") from exc
    if response.status_code == 429:
        raise LLMError(429, "The AI model is rate limited right now. Wait a few seconds and try again.")
    if response.status_code >= 400:
        raise LLMError(502, f"The AI model returned an error ({response.status_code}).")
    return response.json()["choices"][0]["message"]["content"] or ""

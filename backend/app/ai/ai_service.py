"""
Unified AI Service — single entry point for all LLM calls.
Reads USE_OLLAMA from config to route between OpenAI and Ollama.
All methods are async. Never call providers directly from routes.
"""
import json
import logging
from typing import AsyncGenerator

import httpx
from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)


class AIService:
    """
    Unified async LLM interface.
    - If settings.USE_OLLAMA is True  → routes to local Ollama
    - If settings.USE_OLLAMA is False → routes to OpenAI API
    """

    def __init__(self) -> None:
        self._openai_client: AsyncOpenAI | None = None

    def _get_openai(self) -> AsyncOpenAI:
        if self._openai_client is None:
            self._openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._openai_client

    # ─── Public interface ──────────────────────────────────────────────────

    async def complete(
        self,
        prompt: str,
        system: str | None = None,
        temperature: float = 0.3,
    ) -> str:
        """Standard completion — returns full string response."""
        if settings.USE_OLLAMA:
            return await self._ollama_complete(prompt, system, temperature)
        return await self._openai_complete(prompt, system, temperature)

    async def complete_json(
        self,
        prompt: str,
        system: str | None = None,
    ) -> dict | list:
        """
        Completion with JSON mode enforced.
        Parses the response and returns a dict or list.
        Raises ValueError if response is not valid JSON.
        """
        if settings.USE_OLLAMA:
            raw = await self._ollama_complete(
                prompt,
                system or "Respond only with valid JSON. No markdown or preamble.",
                temperature=0.1,
            )
        else:
            raw = await self._openai_complete_json(prompt, system)

        # Strip markdown code fences if model wraps response
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            logger.error("JSON parse failed. Raw response:\n%s", raw)
            raise ValueError(f"AI returned invalid JSON: {exc}") from exc

    async def stream(
        self,
        prompt: str,
        system: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Yields string chunks for streaming endpoints."""
        if settings.USE_OLLAMA:
            async for chunk in self._ollama_stream(prompt, system):
                yield chunk
        else:
            async for chunk in self._openai_stream(prompt, system):
                yield chunk

    async def embed(self, text: str) -> list[float]:
        """Returns an embedding vector for the given text."""
        if settings.USE_OLLAMA:
            return await self._ollama_embed(text)
        return await self._openai_embed(text)

    # ─── OpenAI implementations ────────────────────────────────────────────

    async def _openai_complete(
        self, prompt: str, system: str | None, temperature: float
    ) -> str:
        client = self._get_openai()
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=temperature,
        )
        return response.choices[0].message.content or ""

    async def _openai_complete_json(
        self, prompt: str, system: str | None
    ) -> str:
        client = self._get_openai()
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        else:
            messages.append({
                "role": "system",
                "content": "Respond only with valid JSON. No markdown, no preamble.",
            })
        messages.append({"role": "user", "content": prompt})

        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        return response.choices[0].message.content or "{}"

    async def _openai_stream(
        self, prompt: str, system: str | None
    ) -> AsyncGenerator[str, None]:
        client = self._get_openai()
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        async with client.chat.completions.stream(
            model=settings.OPENAI_MODEL,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def _openai_embed(self, text: str) -> list[float]:
        client = self._get_openai()
        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=text[:8000],  # token limit safety
        )
        return response.data[0].embedding

    # ─── Ollama implementations ────────────────────────────────────────────

    async def _ollama_complete(
        self, prompt: str, system: str | None, temperature: float
    ) -> str:
        payload: dict = {
            "model": settings.OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": temperature},
        }
        if system:
            payload["system"] = system

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json=payload,
            )
            resp.raise_for_status()
            return resp.json().get("response", "")

    async def _ollama_stream(
        self, prompt: str, system: str | None
    ) -> AsyncGenerator[str, None]:
        payload: dict = {
            "model": settings.OLLAMA_MODEL,
            "prompt": prompt,
            "stream": True,
        }
        if system:
            payload["system"] = system

        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream(
                "POST",
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json=payload,
            ) as resp:
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        chunk = data.get("response", "")
                        if chunk:
                            yield chunk
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue

    async def _ollama_embed(self, text: str) -> list[float]:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/embeddings",
                json={"model": settings.OLLAMA_MODEL, "prompt": text},
            )
            resp.raise_for_status()
            return resp.json().get("embedding", [])


# ─── Singleton ─────────────────────────────────────────────────────────────────
ai_service = AIService()

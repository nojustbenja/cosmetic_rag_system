from __future__ import annotations

import logging
from collections.abc import AsyncGenerator

import anthropic
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """
    Cliente unificado de LLM que enruta dinámicamente las solicitudes a los diferentes proveedores:
    Google Gemini, OpenAI, OpenRouter, Anthropic Claude, LiteLLM o Kilo Gateway.
    """

    def __init__(self) -> None:
        self.provider = settings.resolved_provider
        self.model = settings.llm_model
        logger.info(f"Inicializado LLMClient con proveedor: {self.provider}, modelo: {self.model}")

    async def stream_completion(self, messages: list[dict[str, str]]) -> AsyncGenerator[str, None]:
        api_key = settings.active_api_key
        base_url = settings.active_base_url

        if not api_key:
            raise ValueError(
                f"Clave de API ausente para el proveedor '{self.provider}'. "
                f"Por favor configura la clave adecuada en tu archivo .env."
            )

        if self.provider == "claude":
            # Formatear mensajes para Anthropic (separa el prompt del sistema)
            system_prompt = ""
            user_messages = []
            for msg in messages:
                if msg.get("role") == "system":
                    system_prompt += msg.get("content", "") + "\n\n"
                else:
                    # Claude acepta roles "user" y "assistant"
                    role = msg.get("role")
                    content = msg.get("content", "")
                    user_messages.append({"role": role, "content": content})

            system_prompt = system_prompt.strip()

            # Configurar cliente de Anthropic
            client_kwargs = {"api_key": api_key}
            # Permitir sobreescritura de base URL si el usuario especificó una personalizada
            if settings.llm_base_url and settings.llm_base_url != "https://api.kilo.ai/api/gateway":
                client_kwargs["base_url"] = base_url

            client = AsyncAnthropic(**client_kwargs)

            try:
                async with client.messages.stream(
                    model=self.model,
                    max_tokens=4096,
                    system=system_prompt if system_prompt else None,
                    messages=user_messages,
                ) as stream:
                    async for text in stream.text_stream:
                        yield text
            except Exception as e:
                logger.error(f"Error en streaming de Anthropic: {e}")
                raise e

        else:
            # Configurar cabeceras adicionales si es Kilo
            default_headers = {}
            if self.provider == "kilo" and settings.kilo_mode:
                default_headers["x-kilocode-mode"] = settings.kilo_mode

            client = AsyncOpenAI(
                base_url=base_url,
                api_key=api_key,
                default_headers=default_headers if default_headers else None,
            )

            try:
                stream = await client.chat.completions.create(
                    model=self.model,
                    messages=messages, # type: ignore
                    stream=True,
                )
                async for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            except Exception as e:
                logger.error(f"Error en streaming compatible con OpenAI ({self.provider}): {e}")
                raise e

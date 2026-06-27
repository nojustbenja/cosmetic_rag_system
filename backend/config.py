from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def resolve_data_path(filename: str) -> Path:
    """
    Retorna la ruta para un archivo de datos. Redirige a /data si existe el almacenamiento
    persistente en Hugging Face Spaces. Si el archivo no existe en el almacenamiento persistente
    pero sí localmente en el contenedor, se copia para sembrar la información inicial.
    """
    import shutil
    import logging
    logger = logging.getLogger(__name__)

    persistent_root = Path("/data")
    local_path = Path(__file__).resolve().parent / "data" / filename

    if persistent_root.exists() and os.access(str(persistent_root), os.W_OK):
        persistent_path = persistent_root / filename
        if not persistent_path.exists() and local_path.exists():
            try:
                # Si el archivo/carpeta es un directorio, usar copytree
                if local_path.is_dir():
                    shutil.copytree(local_path, persistent_path)
                else:
                    persistent_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(local_path, persistent_path)
                logger.info(f"Sembrado inicial exitoso: {filename} copiado a almacenamiento persistente.")
            except Exception as e:
                logger.warning(f"No se pudo copiar {filename} al almacenamiento persistente: {e}")
        return persistent_path

    return local_path


class Settings(BaseSettings):
    llm_provider: str = ""
    llm_model: str = "kilo-auto/balanced"
    llm_base_url: str = "https://api.kilo.ai/api/gateway"
    kilo_fallback_model: str = "kilo-auto/free"
    kilo_fallback_mode: str = "free"
    
    kilo_api_key: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""
    anthropic_api_key: str = ""
    openrouter_api_key: str = ""
    litellm_api_key: str = ""
    
    kilo_mode: str = "free"
    embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"
    allow_embedding_download: bool = False
    embedding_fallback_dimensions: int = 384
    chroma_persist_dir: str = "../chroma_db"
    frontend_origin: str = "http://localhost:5173"

    # Modo caché de respuestas (env CACHE_ENABLED).
    cache_enabled: bool = True

    # Permite activar/desactivar el Reranker ( CrossEncoder ) local en CPU en producción
    reranking_enabled: bool = True

    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def chroma_path(self) -> str:
        import shutil
        import logging
        logger = logging.getLogger(__name__)

        persistent_root = Path("/data")
        local_path = Path(__file__).parent / self.chroma_persist_dir

        if persistent_root.exists() and os.access(str(persistent_root), os.W_OK):
            persistent_path = persistent_root / "chroma_db"
            if not persistent_path.exists() and local_path.exists():
                try:
                    shutil.copytree(local_path, persistent_path)
                    logger.info("Sembrado inicial exitoso: chroma_db copiado a almacenamiento persistente.")
                except Exception as e:
                    logger.warning(f"No se pudo copiar chroma_db al almacenamiento persistente: {e}")
            return str(persistent_path.resolve())

        return str(local_path.resolve())

    @property
    def frontend_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.frontend_origin.split(",")]
        return [origin for origin in origins if origin]

    @property
    def resolved_provider(self) -> str:
        try:
            from rag.provider_config import resolve_provider_config

            return resolve_provider_config(self).provider
        except Exception:
            pass

        if self.llm_provider:
            provider = self.llm_provider.lower().strip()
            aliases = {
                "klo": "kilo",
                "kilogateway": "kilo",
                "kilo_gateway": "kilo",
            }
            return aliases.get(provider, provider)
        
        # Auto-infer provider based on populated API keys
        if self.gemini_api_key:
            return "gemini"
        if self.anthropic_api_key:
            return "claude"
        if self.openai_api_key:
            return "openai"
        if self.openrouter_api_key:
            return "openrouter"
        if self.kilo_api_key:
            return "kilo"
        if self.litellm_api_key:
            return "litellm"
        
        return "kilo"

    @property
    def active_api_key(self) -> str:
        try:
            from rag.provider_config import resolve_provider_config

            return resolve_provider_config(self).api_key
        except Exception:
            pass

        prov = self.resolved_provider
        if prov == "gemini":
            return self.gemini_api_key
        elif prov == "claude":
            return self.anthropic_api_key
        elif prov == "openai":
            return self.openai_api_key
        elif prov == "openrouter":
            return self.openrouter_api_key
        elif prov == "litellm":
            return self.litellm_api_key
        elif prov == "kilo":
            return self.kilo_api_key
        return ""

    @property
    def active_base_url(self) -> str:
        try:
            from rag.provider_config import resolve_provider_config

            return resolve_provider_config(self).base_url
        except Exception:
            pass

        prov = self.resolved_provider
        is_custom_url = self.llm_base_url and self.llm_base_url != "https://api.kilo.ai/api/gateway"
        
        if is_custom_url:
            return self.llm_base_url
            
        if prov == "gemini":
            return "https://generativelanguage.googleapis.com/v1beta/openai/"
        elif prov == "openai":
            return "https://api.openai.com/v1"
        elif prov == "openrouter":
            return "https://openrouter.ai/api/v1"
        elif prov == "claude":
            return "https://api.anthropic.com"
        elif prov == "litellm":
            return self.llm_base_url or "http://localhost:4000/v1"
        elif prov == "kilo":
            return self.llm_base_url or "https://api.kilo.ai/api/gateway"
            
        return self.llm_base_url

    @property
    def llm_api_key(self) -> str:
        return self.active_api_key or self.kilo_api_key or self.openrouter_api_key



@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

# Trigger CI deploy workflow

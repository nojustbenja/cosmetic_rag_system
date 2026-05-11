from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    kilo_api_key: str = ""
    openrouter_api_key: str = ""
    llm_model: str = "kilo-auto/balanced"
    llm_base_url: str = "https://api.kilo.ai/api/gateway"
    kilo_mode: str = "general"
    embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"
    chroma_persist_dir: str = "../chroma_db"
    frontend_origin: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def chroma_path(self) -> str:
        path = Path(__file__).parent / self.chroma_persist_dir
        return str(path.resolve())

    @property
    def llm_api_key(self) -> str:
        return self.kilo_api_key or self.openrouter_api_key


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

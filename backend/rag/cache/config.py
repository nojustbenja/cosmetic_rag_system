"""Configuración runtime del modo caché.

Espeja el patrón de `rag/provider_config.py`: el estado se persiste en un
JSON bajo `data/` y se puede cambiar en caliente (sin reiniciar) desde el
BackOffice vía los endpoints `GET/PUT /cache-config`.

Decisiones de diseño:
  * El **default** sale de `settings.cache_enabled` (env `CACHE_ENABLED`),
    de modo que el comportamiento por defecto es configurable por entorno.
    Para no cambiar el comportamiento histórico (caché siempre activo), ese
    setting viene en ``True`` por defecto.
  * Si el archivo no existe o está corrupto, se cae al default del entorno.
  * Se expone `backend` y `threshold` para dejar preparado el cambio de
    almacén y el ajuste de sensibilidad sin tocar código.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class DynamicConfigPath:
    def __init__(self, filename: str) -> None:
        self.filename = filename

    @property
    def _path(self) -> Path:
        from config import resolve_data_path
        return resolve_data_path(self.filename)

    def __getattr__(self, name: str):
        return getattr(self._path, name)

    def __str__(self) -> str:
        return str(self._path)

    def __fspath__(self) -> str:
        import os
        return os.fspath(self._path)


CONFIG_PATH = DynamicConfigPath("cache_config.json")

#: Backends válidos reconocidos por el servicio.
VALID_BACKENDS = ("chroma", "memory")

DEFAULT_THRESHOLD = 0.95


def _read_persisted() -> dict[str, Any]:
    if not CONFIG_PATH.exists():
        return {}
    try:
        with CONFIG_PATH.open("r", encoding="utf-8") as file:
            data = json.load(file)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        logger.warning("cache_config.json corrupto; usando defaults.")
        return {}


def _env_default_enabled() -> bool:
    try:
        from config import settings

        return bool(getattr(settings, "cache_enabled", True))
    except Exception:  # noqa: BLE001
        return True


def resolve_cache_config() -> dict[str, Any]:
    """Estado efectivo del caché (persistido sobre default de entorno)."""
    persisted = _read_persisted()
    enabled = persisted.get("enabled")
    if enabled is None:
        enabled = _env_default_enabled()

    backend = str(persisted.get("backend") or "chroma").strip().lower()
    if backend not in VALID_BACKENDS:
        backend = "chroma"

    try:
        threshold = float(persisted.get("threshold", DEFAULT_THRESHOLD))
    except (TypeError, ValueError):
        threshold = DEFAULT_THRESHOLD
    threshold = min(max(threshold, 0.0), 1.0)

    return {"enabled": bool(enabled), "backend": backend, "threshold": threshold}


def is_cache_enabled() -> bool:
    return resolve_cache_config()["enabled"]


def save_cache_config(payload: dict[str, Any]) -> dict[str, Any]:
    """Persiste el estado del caché. Solo escribe campos reconocidos."""
    current = resolve_cache_config()

    enabled = payload.get("enabled")
    backend = payload.get("backend")
    threshold = payload.get("threshold")

    data = {
        "enabled": bool(current["enabled"] if enabled is None else enabled),
        "backend": (
            str(backend).strip().lower()
            if backend and str(backend).strip().lower() in VALID_BACKENDS
            else current["backend"]
        ),
        "threshold": current["threshold"],
    }
    if threshold is not None:
        try:
            data["threshold"] = min(max(float(threshold), 0.0), 1.0)
        except (TypeError, ValueError):
            pass

    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CONFIG_PATH.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2, ensure_ascii=False)

    # No reconstruimos el backend aquí: `service.get_backend()` ya detecta de
    # forma perezosa cuando cambia el almacén seleccionado y lo reconstruye sin
    # descartar datos en los toggles de enabled/threshold.

    logger.info(
        "Modo caché actualizado: enabled=%s backend=%s threshold=%.2f",
        data["enabled"],
        data["backend"],
        data["threshold"],
    )
    return data

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


CONFIG_PATH = Path(__file__).resolve().parents[1] / "data" / "provider_config.json"


@dataclass(frozen=True)
class ProviderSpec:
    id: str
    label: str
    default_model: str
    default_base_url: str
    key_field: str
    supports_kilo_mode: bool = False
    billing_hook: str = "future"


@dataclass(frozen=True)
class RuntimeProviderConfig:
    provider: str
    label: str
    model: str
    base_url: str
    api_key: str
    api_key_set: bool
    kilo_mode: str = ""


PROVIDER_ALIASES = {
    "klo": "kilo",
    "kilogateway": "kilo",
    "kilo_gateway": "kilo",
    "anthropic": "claude",
    "google": "gemini",
}


PROVIDER_SPECS: dict[str, ProviderSpec] = {
    "openai": ProviderSpec(
        id="openai",
        label="OpenAI",
        default_model="gpt-4o-mini",
        default_base_url="https://api.openai.com/v1",
        key_field="openai_api_key",
    ),
    "gemini": ProviderSpec(
        id="gemini",
        label="Google Gemini",
        default_model="gemini-1.5-flash",
        default_base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        key_field="gemini_api_key",
    ),
    "claude": ProviderSpec(
        id="claude",
        label="Anthropic Claude",
        default_model="claude-3-5-haiku-latest",
        default_base_url="https://api.anthropic.com",
        key_field="anthropic_api_key",
    ),
    "litellm": ProviderSpec(
        id="litellm",
        label="LiteLLM",
        default_model="gpt-4o-mini",
        default_base_url="http://localhost:4000/v1",
        key_field="litellm_api_key",
    ),
    "kilo": ProviderSpec(
        id="kilo",
        label="Kilo Gateway",
        default_model="kilo-auto/free",
        default_base_url="https://api.kilo.ai/api/gateway",
        key_field="kilo_api_key",
        supports_kilo_mode=True,
    ),
    "openrouter": ProviderSpec(
        id="openrouter",
        label="OpenRouter",
        default_model="openai/gpt-4o-mini",
        default_base_url="https://openrouter.ai/api/v1",
        key_field="openrouter_api_key",
    ),
}


def normalize_provider(provider: str | None) -> str:
    value = (provider or "").strip().lower()
    if not value:
        return "kilo"
    return PROVIDER_ALIASES.get(value, value)


def provider_options() -> list[dict[str, Any]]:
    return [asdict(spec) for spec in PROVIDER_SPECS.values()]


def _read_persisted_config() -> dict[str, Any]:
    if not CONFIG_PATH.exists():
        return {}
    try:
        with CONFIG_PATH.open("r", encoding="utf-8") as file:
            data = json.load(file)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def _settings_key(settings: Any, spec: ProviderSpec) -> str:
    return str(getattr(settings, spec.key_field, "") or "")


def infer_provider_from_settings(settings: Any) -> str:
    configured = normalize_provider(getattr(settings, "llm_provider", ""))
    if getattr(settings, "llm_provider", ""):
        return configured

    for provider_id in ("gemini", "claude", "openai", "openrouter", "kilo", "litellm"):
        spec = PROVIDER_SPECS[provider_id]
        if _settings_key(settings, spec):
            return provider_id
    return "kilo"


def resolve_provider_config(settings: Any) -> RuntimeProviderConfig:
    persisted = _read_persisted_config()
    provider = normalize_provider(persisted.get("provider") or infer_provider_from_settings(settings))
    spec = PROVIDER_SPECS.get(provider, PROVIDER_SPECS["kilo"])
    provider = spec.id

    model = str(persisted.get("model") or getattr(settings, "llm_model", "") or spec.default_model).strip()
    base_url = str(persisted.get("base_url") or spec.default_base_url).strip()
    api_key = str(persisted.get("api_key") or _settings_key(settings, spec)).strip()
    kilo_mode = str(persisted.get("kilo_mode") or getattr(settings, "kilo_mode", "") or "free").strip()

    return RuntimeProviderConfig(
        provider=provider,
        label=spec.label,
        model=model or spec.default_model,
        base_url=base_url or spec.default_base_url,
        api_key=api_key,
        api_key_set=bool(api_key),
        kilo_mode=kilo_mode if spec.supports_kilo_mode else "",
    )


def public_provider_config(settings: Any) -> dict[str, Any]:
    config = resolve_provider_config(settings)
    public = asdict(config)
    public.pop("api_key", None)
    public["providers"] = provider_options()
    public["billing"] = {"enabled": False, "hook": "provider billing metadata can attach here later"}
    return public


def save_provider_config(settings: Any, payload: dict[str, Any]) -> dict[str, Any]:
    provider = normalize_provider(payload.get("provider"))
    if provider not in PROVIDER_SPECS:
        raise ValueError(f"Proveedor no soportado: {payload.get('provider')}")

    current = resolve_provider_config(settings)
    spec = PROVIDER_SPECS[provider]
    incoming_key = str(payload.get("api_key") or "").strip()
    stored_key = incoming_key or (current.api_key if current.provider == provider else "")

    data = {
        "provider": provider,
        "model": str(payload.get("model") or spec.default_model).strip(),
        "base_url": str(payload.get("base_url") or spec.default_base_url).strip(),
        "api_key": stored_key,
        "kilo_mode": str(payload.get("kilo_mode") or "free").strip() if spec.supports_kilo_mode else "",
    }

    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CONFIG_PATH.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2, ensure_ascii=False)

    return public_provider_config(settings)


def validate_provider_payload(settings: Any, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    if payload:
        provider = normalize_provider(payload.get("provider"))
        spec = PROVIDER_SPECS.get(provider)
        if not spec:
            return {"ok": False, "message": f"Proveedor no soportado: {payload.get('provider')}"}

        api_key = str(payload.get("api_key") or _settings_key(settings, spec)).strip()
        model = str(payload.get("model") or spec.default_model).strip()
        base_url = str(payload.get("base_url") or spec.default_base_url).strip()
    else:
        config = resolve_provider_config(settings)
        provider = config.provider
        spec = PROVIDER_SPECS[provider]
        api_key = config.api_key
        model = config.model
        base_url = config.base_url

    missing = []
    if not model:
        missing.append("modelo")
    if not base_url:
        missing.append("base URL")
    if not api_key:
        missing.append("API key")

    if missing:
        return {
            "ok": False,
            "provider": spec.id,
            "message": f"Faltan campos para {spec.label}: {', '.join(missing)}.",
        }

    return {
        "ok": True,
        "provider": spec.id,
        "message": f"{spec.label} está configurado para {model}.",
    }

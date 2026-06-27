#!/usr/bin/env python3
"""Cache warming de las preguntas frecuentes de Lumi.

Pre-puebla el caché semántico lanzando una consulta `POST /chat` por cada FAQ
con un PERFIL COMPLETO y SIN ALERGIAS, de modo que el flujo llegue a la rama
de retrieval que cachea la respuesta. Consume el SSE hasta el evento `done`.

Las preguntas salen de `data/question_seed.json` + las top reales de
`data/question_events.json` (NO se inventan). El perfil de cada una se elige
para cubrir variedad de skin_type (seca, grasa, mixta, sensible, "todas").

Uso:
    python scripts/warm_cache.py --base-url http://127.0.0.1:8001
"""

from __future__ import annotations

import argparse
import json
import sys
import time

import httpx

# (query, profile) — perfil COMPLETO sin missing_fields para alcanzar retrieval.
# Cubrimos seca / grasa / mixta / sensible y "todas" (fragancias/accesorios,
# donde el tipo de piel no aplica y skin_type queda None => partición "todas").
FAQS: list[tuple[str, dict]] = [
    (
        "Busco una crema hidratante de día",
        {"skin_type": "seca", "concern": "hidratacion", "usage_moment": "dia",
         "category": "cuidado_facial", "budget_max": 50000, "allergies": []},
    ),
    (
        "Qué sérums con vitamina C recomiendas",
        {"skin_type": "mixta", "concern": "luminosidad", "usage_moment": "dia",
         "category": "cuidado_facial", "budget_max": 60000, "allergies": []},
    ),
    (
        "Busco un protector solar que no deje blanco",
        {"skin_type": "grasa", "concern": "proteccion", "usage_moment": "dia",
         "category": "proteccion_solar", "budget_max": 40000, "allergies": []},
    ),
    (
        "Necesito una base de larga duración",
        {"skin_type": "grasa", "concern": "larga duracion",
         "category": "maquillaje", "budget_max": 45000, "allergies": []},
    ),
    (
        "Necesito un buen contorno de ojos",
        {"skin_type": "sensible", "concern": "antiedad", "usage_moment": "noche",
         "category": "cuidado_facial", "budget_max": 55000, "allergies": []},
    ),
    (
        "Busco un limpiador que no reseque la piel",
        {"skin_type": "seca", "concern": "hidratacion",
         "category": "limpieza", "budget_max": 30000, "allergies": []},
    ),
    (
        "Busco un perfume amaderado para la noche",
        {"concern": "aroma amaderado", "usage_moment": "noche",
         "category": "fragancias", "budget_max": 90000, "allergies": []},
    ),
    (
        "Qué producto da efecto glow para un evento",
        {"skin_type": "mixta", "concern": "luminosidad", "usage_moment": "dia",
         "category": "maquillaje", "budget_max": 70000, "allergies": []},
    ),
    (
        "Qué regalo de skincare premium recomiendas",
        {"skin_type": "normal", "concern": "antiedad",
         "category": "cuidado_facial", "budget_max": 150000, "allergies": []},
    ),
    (
        "Tengo piel mixta y quiero más luminosidad",
        {"skin_type": "mixta", "concern": "luminosidad", "usage_moment": "dia",
         "category": "cuidado_facial", "budget_max": 60000, "allergies": []},
    ),
    (
        "Necesito maquillaje de larga duración para piel grasa",
        {"skin_type": "grasa", "concern": "larga duracion",
         "category": "maquillaje", "budget_max": 50000, "allergies": []},
    ),
    (
        "Arma una rutina simple con presupuesto bajo",
        {"skin_type": "seca", "concern": "hidratacion", "usage_moment": "dia",
         "category": "cuidado_facial", "budget_max": 25000, "allergies": []},
    ),
]


def _parse_sse(raw: str) -> list[tuple[str, str]]:
    """Devuelve lista de (event, data) a partir del stream SSE crudo."""
    events: list[tuple[str, str]] = []
    event = ""
    for line in raw.splitlines():
        line = line.strip()
        if line.startswith("event:"):
            event = line[len("event:"):].strip()
        elif line.startswith("data:"):
            events.append((event, line[len("data:"):].strip()))
    return events


def warm_one(client: httpx.Client, base_url: str, query: str, profile: dict, idx: int) -> str:
    """Lanza una consulta y resume el resultado. Devuelve un status corto."""
    payload = {
        "message": query,
        "session_id": f"warm-{idx}",
        "profile": profile,
        "history": [],
    }
    with client.stream("POST", f"{base_url}/chat", json=payload, timeout=120) as resp:
        resp.raise_for_status()
        raw = "".join(chunk for chunk in resp.iter_text())

    events = _parse_sse(raw)
    kinds = [e for e, _ in events]
    n_products = kinds.count("product")
    mode = ""
    for ev, data in events:
        if ev == "context_done":
            try:
                mode = json.loads(data).get("mode", "")
            except json.JSONDecodeError:
                pass
    got_done = "done" in kinds
    got_error = "error" in kinds
    if got_error:
        return f"ERROR ({n_products} prod, mode={mode})"
    if mode == "match" and n_products > 0:
        return f"OK match · {n_products} productos · done={got_done}"
    return f"sin-match · mode={mode} · {n_products} prod · done={got_done}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Warm Lumi semantic cache with FAQs.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8001")
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/")

    with httpx.Client() as client:
        # 1. Asegurar caché ON.
        r = client.put(f"{base_url}/cache-config", json={"enabled": True}, timeout=10)
        r.raise_for_status()
        before = client.get(f"{base_url}/cache-config", timeout=10).json()
        print(f"Cache antes: {before}")

        print(f"\nWarming {len(FAQS)} FAQs contra {base_url} ...\n")
        ok = 0
        for i, (query, profile) in enumerate(FAQS, start=1):
            t0 = time.perf_counter()
            try:
                status = warm_one(client, base_url, query, profile, i)
            except Exception as exc:  # noqa: BLE001
                status = f"EXCEPCION: {exc}"
            dt = time.perf_counter() - t0
            if status.startswith("OK"):
                ok += 1
            print(f"[{i:2}/{len(FAQS)}] ({dt:5.1f}s) {query[:48]:48} -> {status}")

        after = client.get(f"{base_url}/cache-config", timeout=10).json()
        print(f"\nCache después: {after}")
        print(f"FAQs con match cacheado: {ok}/{len(FAQS)} | entries={after.get('entries')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

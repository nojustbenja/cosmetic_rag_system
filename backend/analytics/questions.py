from __future__ import annotations

import json
import math
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
SEED_PATH = DATA_DIR / "question_seed.json"
EVENTS_PATH = DATA_DIR / "question_events.json"

STOPWORDS = {
    "a",
    "al",
    "algo",
    "con",
    "como",
    "cual",
    "cuales",
    "de",
    "del",
    "el",
    "en",
    "es",
    "esta",
    "este",
    "la",
    "las",
    "lo",
    "los",
    "mas",
    "me",
    "mi",
    "mis",
    "para",
    "por",
    "que",
    "quiero",
    "sin",
    "tengo",
    "un",
    "una",
    "y",
}

VALID_EVENT_TYPES = {
    "impression",
    "click",
    "sent",
    "answered",
    "stop",
    "product_view",
    "cart_add",
    "checkout",
}

GROUP_LABELS = {
    "frequent": "Frecuentes",
    "trending": "Trending",
    "specific": "Casos específicos",
}

EVENT_WEIGHTS = {
    "impression": 0.15,
    "click": 2.8,
    "sent": 4.0,
    "answered": 1.6,
    "stop": -1.0,
    "product_view": 0.3,
    "cart_add": 0.8,
    "checkout": 1.2,
}


def normalize_question(text: str) -> str:
    value = unicodedata.normalize("NFD", text.lower())
    value = "".join(char for char in value if unicodedata.category(char) != "Mn")
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    tokens = [token for token in value.split() if token and token not in STOPWORDS]
    return " ".join(tokens)


def ensure_data_files() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not SEED_PATH.exists():
        SEED_PATH.write_text("[]\n", encoding="utf-8")
    if not EVENTS_PATH.exists():
        EVENTS_PATH.write_text("[]\n", encoding="utf-8")


def load_seed() -> list[dict[str, Any]]:
    ensure_data_files()
    try:
        data = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []


def load_events() -> list[dict[str, Any]]:
    ensure_data_files()
    try:
        data = json.loads(EVENTS_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []


def save_events(events: list[dict[str, Any]]) -> None:
    ensure_data_files()
    EVENTS_PATH.write_text(json.dumps(events, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _safe_session_id(session_id: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]", "", session_id)[:80] or "anonymous"


def _safe_product_ids(product_ids: list[str] | None) -> list[str]:
    if not product_ids:
        return []
    safe: list[str] = []
    for product_id in product_ids[:12]:
        cleaned = re.sub(r"[^a-zA-Z0-9_.:-]", "", str(product_id))[:96]
        if cleaned:
            safe.append(cleaned)
    return safe


def record_event(payload: dict[str, Any]) -> dict[str, Any]:
    event_type = str(payload.get("event_type", "")).strip()
    if event_type not in VALID_EVENT_TYPES:
        raise ValueError("Invalid question event type.")

    question = str(payload.get("question") or "").strip()[:500]
    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_id": _safe_session_id(str(payload.get("session_id") or "")),
        "event_type": event_type,
        "question": question,
        "normalized_question": normalize_question(question),
        "suggestion_id": str(payload.get("suggestion_id") or "")[:96],
        "source": str(payload.get("source") or "")[:60],
        "product_ids": _safe_product_ids(payload.get("product_ids")),
    }
    events = load_events()
    events.append(event)
    save_events(events[-5000:])
    return {"status": "ok", "event": event}


def _parse_timestamp(event: dict[str, Any]) -> datetime:
    raw = str(event.get("timestamp") or "")
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(timezone.utc)


def _period_start(period: str, now: datetime) -> datetime:
    if period == "month":
        return now - timedelta(days=30)
    return now - timedelta(days=7)


def _event_question(event: dict[str, Any]) -> str:
    return str(event.get("question") or "").strip()


def _recent_multiplier(ts: datetime, now: datetime) -> float:
    age_hours = max((now - ts).total_seconds() / 3600, 0)
    return 1 + math.exp(-age_hours / 72)


def build_question_index(period: str = "week") -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    start = _period_start(period, now)
    events = load_events()
    period_events = [event for event in events if _parse_timestamp(event) >= start]

    by_norm: dict[str, dict[str, Any]] = {}
    type_counts: Counter[str] = Counter()
    impressions = 0
    chip_clicks = 0

    for event in period_events:
        event_type = str(event.get("event_type") or "")
        question = _event_question(event)
        normalized = str(event.get("normalized_question") or normalize_question(question))
        if not normalized:
            continue

        type_counts[event_type] += 1
        if event_type == "impression":
            impressions += 1
        if event_type == "click":
            chip_clicks += 1

        row = by_norm.setdefault(
            normalized,
            {
                "question": question,
                "normalized": normalized,
                "counts": Counter(),
                "score": 0.0,
                "last_seen": "",
            },
        )
        if len(question) > len(row["question"]):
            row["question"] = question
        row["counts"][event_type] += 1
        ts = _parse_timestamp(event)
        row["score"] += EVENT_WEIGHTS.get(event_type, 0) * _recent_multiplier(ts, now)
        row["last_seen"] = max(row["last_seen"], ts.isoformat())

    for row in by_norm.values():
        row["total"] = sum(row["counts"].values())
        row["sent_count"] = row["counts"].get("sent", 0)
        row["click_count"] = row["counts"].get("click", 0)
        row["answered_count"] = row["counts"].get("answered", 0)
        row["impression_count"] = row["counts"].get("impression", 0)
        row["stop_count"] = row["counts"].get("stop", 0)
        del row["counts"]

    trending = sorted(by_norm.values(), key=lambda item: (item["score"], item["sent_count"]), reverse=True)
    faq = sorted(by_norm.values(), key=lambda item: (item["sent_count"], item["total"], item["score"]), reverse=True)

    return {
        "period": period,
        "events": period_events,
        "questions": list(by_norm.values()),
        "trending": trending,
        "faq": faq,
        "kpis": {
            "questions": type_counts.get("sent", 0),
            "answered": type_counts.get("answered", 0),
            "click_through": round(chip_clicks / impressions, 3) if impressions else 0,
            "impressions": impressions,
            "clicks": chip_clicks,
            "stops": type_counts.get("stop", 0),
        },
    }


def get_suggestions(limit_per_group: int = 5) -> list[dict[str, Any]]:
    seed = load_seed()
    index = build_question_index("week")
    by_seed_norm = {normalize_question(str(item.get("text") or "")): item for item in seed}

    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in seed:
        group = str(item.get("group") or "frequent")
        normalized = normalize_question(str(item.get("text") or ""))
        score = next((row["score"] for row in index["questions"] if row["normalized"] == normalized), 0)
        groups[group].append({
            "id": item.get("id"),
            "text": item.get("text"),
            "group": group,
            "label": GROUP_LABELS.get(group, group.title()),
            "score": score,
            "is_trending": group == "trending",
        })

    for row in index["trending"][:8]:
        if row["normalized"] in by_seed_norm:
            continue
        groups["trending"].append({
            "id": f"event-{row['normalized'][:40].replace(' ', '-')}",
            "text": row["question"],
            "group": "trending",
            "label": GROUP_LABELS["trending"],
            "score": round(row["score"], 2),
            "is_trending": True,
        })

    suggestions: list[dict[str, Any]] = []
    for group in ("frequent", "trending", "specific"):
        ranked = sorted(groups[group], key=lambda item: item.get("score", 0), reverse=True)
        suggestions.extend(ranked[:limit_per_group])
    return suggestions


def get_stats(period: str = "week") -> dict[str, Any]:
    period = "month" if period == "month" else "week"
    week = build_question_index("week")
    month = build_question_index("month")
    current = month if period == "month" else week
    return {
        "period": period,
        "kpis": {
            "questions_week": week["kpis"]["questions"],
            "questions_month": month["kpis"]["questions"],
            "chip_ctr": current["kpis"]["click_through"],
            "answered": current["kpis"]["answered"],
            "impressions": current["kpis"]["impressions"],
            "clicks": current["kpis"]["clicks"],
            "stops": current["kpis"]["stops"],
        },
        "trending": current["trending"][:20],
        "faq": current["faq"][:20],
    }


def search_questions(query: str) -> list[dict[str, Any]]:
    normalized_query = normalize_question(query)
    if not normalized_query:
        return []
    seed_matches = [
        {
            "question": str(item.get("text") or ""),
            "normalized": normalize_question(str(item.get("text") or "")),
            "source": "seed",
            "score": 0,
        }
        for item in load_seed()
        if normalized_query in normalize_question(str(item.get("text") or ""))
    ]
    event_matches = [
        {**item, "source": "events"}
        for item in build_question_index("month")["questions"]
        if normalized_query in item["normalized"] or normalized_query in normalize_question(item["question"])
    ]
    return (event_matches + seed_matches)[:25]

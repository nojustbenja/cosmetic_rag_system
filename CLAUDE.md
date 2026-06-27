# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RAG system for cosmetics sales advice. A FastAPI backend (Python) serves "Lumi", an AI beauty advisor, over an SSE-streaming chat API; a React + TypeScript (Vite) frontend consumes it. There is no database server — ChromaDB (embedded SQLite) holds the vector index, and plain CSV/JSON files under `backend/data/` are the source of truth for catalog, orders, and analytics events.

The `README.md` is extensive and product-focused — trust it for feature behavior and the full API contract. The notes below cover what the README omits or gets wrong.

## Commands

### Backend (run from `backend/`)
```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m ingestion.run_ingestion        # build/refresh ChromaDB from data/ (required before first run)
uvicorn api.main:app --reload            # serves on :8000 locally
pytest                                   # all tests
pytest tests/test_intent_guard.py        # single file
pytest tests/test_chat_logic.py::<name>  # single test
```

### Frontend (run from `frontend/`)
```bash
pnpm install        # or bun install
pnpm run dev        # :5173
pnpm run lint       # eslint
pnpm test           # vitest run (one-shot)
pnpm run test:watch
```

### Whole stack
`./start.sh` from repo root — boots backend (waits for `/health`) then frontend. Honors `BACKEND_PORT` / `FRONTEND_PORT`.

## Port gotcha

Local dev runs the backend on **8000** (`start.sh`, README). The Docker image and Hugging Face Space run it on **7860** (`backend/Dockerfile`). Don't assume one port everywhere.

## Architecture

### RAG pipeline (`backend/rag/`)
A single chat turn (`POST /chat`, SSE) flows through `pipeline.py`:
1. **Profile extraction** — infers the client profile (skin type, concern, usage moment, fragrance family, budget, sensitivity) from the message, partly by keyword/rule heuristics (`_profile_signals`) and partly via the LLM intent analyzer.
2. **Mode branch** — if the profile is too thin, **profiler mode** asks follow-up questions and emits no products. If it's sufficient, **recommender mode** runs retrieval.
3. **Retrieval** (`retriever.py`) is **hybrid, not plain vector search** (the README undersells this): ChromaDB cosine similarity + **BM25** (`rank_bm25`) lexical scoring, then a **CrossEncoder reranker** (`cross-encoder/ms-marco-MiniLM-L-6-v2`, loaded lazily, forced to CPU). The reranker runs in a thread to avoid blocking the event loop, and loads with `local_files_only=True` first — the Dockerfile pre-downloads it at build time so production never hits the network.
4. **Streaming** — products are emitted as individual `product` SSE events as they're found, then `context_done`, then the LLM answer streams as `token` events. Event types: `profile`, `product`, `context_done`, `token`, `done`, `error`.

Two ChromaDB collections, both `hnsw:space=cosine`: **`productos`** and **`guias`**. Embeddings use `paraphrase-multilingual-MiniLM-L12-v2`.

### Multi-LLM client (`rag/llm_client.py` + `rag/provider_config.py`)
All providers except Anthropic go through the **OpenAI-compatible** `AsyncOpenAI` client with a swapped `base_url` (Gemini, OpenAI, OpenRouter, Kilo, LiteLLM); Anthropic uses `AsyncAnthropic`. `config.py` auto-resolves provider/key/base-url from env, but `provider_config.py` lets the BackOffice override the provider **at runtime** (`PUT /provider-config`) without a restart — `resolved_provider`/`active_api_key`/`active_base_url` in `config.py` defer to it first. Default provider is Kilo.

### Startup warmup (`api/main.py`)
A lifespan task preloads the embedding model and opens both Chroma collections in a background thread so the first user message doesn't pay cold-start. It's wrapped to never crash the server.

### Re-ingestion on writes
Creating/editing/importing products via the BackOffice endpoints re-indexes ChromaDB automatically (`ingestion/ingest_csv.py` handles CRUD + bulk). `data/productos.csv` is the catalog source of truth.

### Analytics (`analytics/questions.py`)
File-backed (`data/question_events.json`, capped at 5000 events; curated seeds in `data/question_seed.json`). Trending score = weighted-by-event-type × exponential recency. No DB — extend this module if you need real persistence.

### Frontend (`frontend/src/`)
`@` aliases `src/`. React Query for server state; SSE parsing and the HTTP client live in `lib/api.ts`. `pages/Index.tsx` is the chat+catalog view, `pages/BackOffice.tsx` is the admin panel. Domain types in `types/shop.ts`. A Supabase Edge Function (`supabase/functions/`) exists for an optional AI-shopper feature.

## Conventions / discrepancies to know

- The README says React 19; `package.json` pins **React 18.3.1**. Trust `package.json`.
- API keys never touch the browser — the frontend posts them to the backend, which owns all LLM calls. Keep it that way.
- Code, comments, and identifiers are mixed Spanish/English; existing comments are Spanish. Match the surrounding file.
- Conventional commits, no AI attribution (per global rules).
- No backend lint/format config committed; follow existing style (type hints, `from __future__ import annotations`).

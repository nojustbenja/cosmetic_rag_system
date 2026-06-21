---
title: Cosmetic Rag System
emoji: 🧴
colorFrom: pink
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# Sistema RAG Cosmética — Backend

API FastAPI (RAG + multi-LLM) que potencia a Lumi, la asesora de belleza IA.
El catálogo y las guías PDF se ingestan en ChromaDB durante el build de la
imagen Docker.

## Variables de entorno (Secrets del Space)

- `LLM_PROVIDER` (ej. `kilo`)
- `KILO_API_KEY`
- `KILO_MODE` (`free` | `general` | `pro`)
- `FRONTEND_ORIGIN` — origen(es) permitidos para CORS, separados por coma

Ver `.env.example` para la lista completa de opciones. 

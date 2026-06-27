# PROMPT — Sesión de cache warming + testing (Lumi RAG)

> Cópialo entero como primer mensaje de una sesión nueva (tokens frescos).
> Es autocontenido: la otra sesión no tiene este contexto.

---

Trabaja en el proyecto **Lumi** (Sistema RAG de cosmética), en:
`/Users/benja/Proyects/Learning/Taller de inovacion/Sistema Rag`

Lee primero `CLAUDE.md` en la raíz para el contexto de arquitectura.

## Qué existe ya (NO lo reimplementes)
En una sesión previa se implementó una **capa de caché desacoplada** con modo on/off:
- Paquete `backend/rag/cache/`: `base.py` (contrato `SemanticCacheBackend`),
  `chroma_backend.py` (default, persistente), `memory_backend.py`,
  `config.py` (flag runtime en `data/cache_config.json`), `service.py` (fachada
  con logging `CACHE HIT` / `MISS` / `STORE`).
- Endpoints: `GET/PUT /cache-config` (activar/desactivar, backend, threshold) y
  `POST /cache-config/clear`.
- UI: tarjeta "⚙️ Performance · Modo caché" en el BackOffice (tab providers) con
  switch on/off, badges y botón "Vaciar caché".
- Se invoca desde `backend/api/routes.py` en el endpoint `POST /chat` (SSE):
  `lookup_cached_response(...)` antes del pipeline, `store_response(...)` después.
- La clave del caché HOY particiona por `skin_type` del perfil
  (`where={"skin_type": skin_type}`) con umbral coseno 0.95.

## ⚠️ Tarea 1 — ARREGLO DE SEGURIDAD (hacer PRIMERO, es código)
**Problema:** el caché ignora las ALERGIAS. Si un perfil con alergia hace una
consulta parecida a una ya cacheada (mismo skin_type, sin alergia), recibiría una
respuesta cacheada que podría recomendar un producto contraindicado. Inaceptable.

**Solución (mínima, en la fachada para no tocar lógica de negocio):**
- En `backend/rag/cache/service.py`, en `lookup_cached_response(...)` y en
  `store_response(...)`: si `profile.get("allergies")` es no vacío → **bypass total**
  (lookup devuelve `None`, store es no-op) y loguear
  `CACHE BYPASS (allergies present) — forzando pipeline por seguridad`.
- Razón de diseño: una respuesta para alguien sin alergias NO es segura para
  reutilizar con alguien que sí las tiene. Siempre re-preguntar a la IA.
- Añadir un test en `backend/tests/` (p. ej. `test_cache_safety.py`) que verifique:
  (a) perfil sin alergias → store + HIT; (b) MISMA query con `allergies=["retinol"]`
  → MISS forzado aunque exista la entrada cacheada.
- Verificar: `cd backend && pytest` (usa el `pytest.ini` ya existente). Debe quedar verde.

## Tarea 2 — Cache warming de las preguntas frecuentes
Objetivo: pre-poblar el caché para que en la demo las FAQ respondan al instante.

Fuente de las preguntas (NO inventar): `backend/data/question_seed.json` +
las top reales de `backend/data/question_events.json`. Las más comunes son:
- "Busco una crema hidratante de día"
- "Qué sérums con vitamina C recomiendas"
- "Busco un protector solar que no deje blanco"
- "Necesito una base de larga duración"
- "Necesito un buen contorno de ojos"
- "Busco un limpiador que no reseque la piel"
- "Busco un perfume amaderado para la noche"
- "Qué producto da efecto glow para un evento"
- "Qué regalo de skincare premium recomiendas"
- "Tengo piel mixta y quiero más luminosidad"
- "Necesito maquillaje de larga duración para piel grasa"
- "Arma una rutina simple con presupuesto bajo"

Cómo hacer el warming (elige lo más simple que funcione):
1. Asegúrate de que el modo caché está ON: `PUT /cache-config {"enabled": true}`.
2. Levanta backend (`uvicorn api.main:app` en :8000) y frontend si hace falta.
3. Para cada FAQ, lanza una consulta `POST /chat` con un PERFIL SIN ALERGIAS y
   un `skin_type` representativo (cubre al menos: seca, grasa, mixta, sensible,
   y "todas" cuando no aplique piel). Esto guarda la respuesta en el caché.
   - IMPORTANTE: el perfil debe estar "completo" (sin `missing_fields`) para que
     el flujo llegue a la rama de retrieval que cachea; si Lumi pide más datos,
     ajusta el perfil enviado en el request.
   - Puedes hacerlo con un script Python (httpx/requests) que itere las FAQ ×
     skin_types y consuma el SSE hasta el evento `done`.
4. Confirma con `GET /cache-config` que `entries` subió.

## Tarea 3 — Test end-to-end de la página (browser)
Usa las herramientas de navegador (browser_*) o la skill `dogfood`. NO requiere
la skill "Playwright" — el navegador nativo ya usa Playwright por debajo.
1. Abre la app (frontend, normalmente http://localhost:5173).
2. Escribe una FAQ ya cacheada → verifica que responde casi instantáneo y que
   en los logs del backend aparece `✅ CACHE HIT`.
3. Repite la MISMA pregunta pero indicando una alergia en el perfil/chat (p. ej.
   "soy alérgica al retinol") → verifica que NO usa caché (log
   `CACHE BYPASS` o `CACHE MISS`) y que la respuesta evita el alérgeno.
4. Apaga el modo caché desde el BackOffice (switch) → repite una FAQ y verifica
   que SIEMPRE ejecuta el pipeline (log `CACHE OFF`), confirmando el toggle.
5. Toma screenshots como evidencia.

## Cierre
- Corre `cd backend && pytest` (verde) y, si tocaste frontend, `npm run lint` +
  `npm run build` en `frontend/`.
- Smoke test de deploy: el backend va a Hugging Face Spaces en Python 3.9 SIN
  tests. Verifica que `api.main.app` importa en 3.9 antes de pushear (no usar
  sintaxis `X | None` en modelos Pydantic; usar `Optional[...]`).
- Commits convencionales, en español/inglés según el archivo, SIN atribución AI.
  Sugerencia: `fix(cache): bypass cache when profile has allergies` +
  `chore(cache): warm cache for frequent questions`.
- Vigila el CI con `gh run list` / `gh run watch` (workflows: Frontend CI y
  Deploy Backend to HF Spaces). No dejes el CI en rojo.

## Notas de entorno (importantes)
- El intérprete con deps + pytest es `backend/.venv-run/bin/python` (Python 3.9).
- Hay un `~/.hermes/hermes-agent/utils.py` que puede eclipsar el paquete `utils/`
  del proyecto en el PATH del shell; el `pytest.ini` (pythonpath=.) ya lo evita,
  pero si corres imports sueltos usa `env -i HOME=$HOME PATH=/usr/bin:/bin
  PYTHONPATH=$(pwd) ./.venv-run/bin/python ...`.
- `gh` ya está autenticado (cuenta nojustbenja); remoto: cosmetic_rag_system.

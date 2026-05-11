# Sistema RAG para Tienda de Cosmética — Guía de Implementación

## Objetivo

Construir un sistema de chat con RAG (Retrieval-Augmented Generation) que ayude a vendedores de una tienda de cosmética a recomendar productos según el perfil del cliente. El vendedor describe al cliente (tipo de piel, edad, necesidad, presupuesto) y el sistema responde con recomendaciones fundamentadas en el catálogo de productos y guías internas.

---

## Stack Tecnológico

| Componente | Tecnología |
|---|---|
| Vector DB | ChromaDB (local, persistente) |
| Embeddings | `paraphrase-multilingual-MiniLM-L12-v2` via sentence-transformers (local, gratis) |
| Framework RAG | Ninguno — implementación directa sin LangChain ni LlamaIndex |
| PDF parsing | PyMuPDF (`fitz`) |
| Backend | Python + FastAPI + uvicorn |
| LLM | Vía OpenRouter o Kilo API Gateway (API compatible con OpenAI SDK) |
| Frontend | SvelteKit (Svelte 5) |
| Streaming | Server-Sent Events (SSE) |

---

## Estructura de Carpetas

```
Sistema Rag/
├── backend/
│   ├── requirements.txt
│   ├── .env                    # OPENROUTER_API_KEY, modelo, config
│   ├── .env.example            # Template sin secretos
│   ├── config.py               # Configuración centralizada (pydantic-settings)
│   ├── ingestion/
│   │   ├── __init__.py
│   │   ├── ingest_csv.py       # Procesa catálogo CSV → ChromaDB
│   │   ├── ingest_pdfs.py      # Procesa PDFs guías → ChromaDB
│   │   ├── chunking.py         # Estrategias de chunking por tipo de documento
│   │   └── run_ingestion.py    # CLI: python -m ingestion.run_ingestion
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── embeddings.py       # Wrapper del modelo sentence-transformers
│   │   ├── retriever.py        # Búsqueda en ChromaDB con metadata filtering
│   │   ├── prompt_templates.py # System prompts + few-shot examples
│   │   └── pipeline.py         # Orquesta: embed → retrieve → prompt → LLM stream
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI app con CORS
│   │   ├── routes.py           # POST /chat (SSE), GET /health
│   │   └── models.py           # Pydantic request/response schemas
│   └── data/
│       ├── productos.csv       # Catálogo de productos
│       └── guias/              # PDFs de guías y manuales
├── frontend/
│   ├── package.json
│   ├── svelte.config.js
│   ├── vite.config.js
│   ├── src/
│   │   ├── app.html
│   │   ├── routes/
│   │   │   └── +page.svelte    # Página principal con chat UI
│   │   └── lib/
│   │       ├── components/
│   │       │   ├── ChatMessage.svelte
│   │       │   └── ChatInput.svelte
│   │       └── api.js          # Cliente SSE para streaming
│   └── static/
└── chroma_db/                  # Almacenamiento persistente ChromaDB (auto-generado)
```

---

## Orden de Implementación (seguir en este orden exacto)

### Paso 1: Scaffolding y configuración

Crear toda la estructura de carpetas, `__init__.py` vacíos, y los archivos de configuración.

**`backend/requirements.txt`:**
```
chromadb>=0.4
sentence-transformers
PyMuPDF
openai
fastapi
uvicorn
python-dotenv
pydantic-settings
sse-starlette
```

**`backend/.env.example`:**
```
OPENROUTER_API_KEY=sk-or-...
LLM_MODEL=anthropic/claude-3.5-sonnet
LLM_BASE_URL=https://openrouter.ai/api/v1
EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2
CHROMA_PERSIST_DIR=../chroma_db
```

**`backend/config.py`:** Usar `pydantic-settings` para cargar las variables del `.env`. Exponer un objeto `settings` singleton con todos los valores tipados.

**Verificación:** `pip install -r requirements.txt` sin errores. `python -c "from config import settings"` carga ok.

---

### Paso 2: Módulo de embeddings

**`backend/rag/embeddings.py`:**
- Cargar el modelo `paraphrase-multilingual-MiniLM-L12-v2` con sentence-transformers
- Exponer dos funciones:
  - `embed_text(text: str) -> list[float]` — embedding de un solo texto
  - `embed_batch(texts: list[str]) -> list[list[float]]` — batch de embeddings
- El modelo se carga una sola vez (singleton/module-level) y se reutiliza
- Dimensión del embedding: 384

**Verificación:** `python -c "from rag.embeddings import embed_text; print(len(embed_text('prueba')))"` → imprime `384`.

---

### Paso 3: Ingesta de productos (CSV)

**`backend/data/productos.csv`:** Crear archivo de ejemplo con 5-10 productos. Columnas sugeridas:
```csv
nombre,marca,categoria,tipo_piel,ingredientes,beneficios,precio,descripcion
"Crema Hidratante Revitalift","L'Oréal","cuidado_facial","seca,normal","ácido hialurónico, pro-retinol","hidratación profunda, reduce líneas",450,"Crema de día con ácido hialurónico..."
```

**`backend/ingestion/ingest_csv.py`:**
- Leer el CSV con el módulo `csv` de Python
- Por cada producto, componer un texto descriptivo:
  ```
  Producto: {nombre}. Marca: {marca}. Categoría: {categoria}.
  Tipo de piel: {tipo_piel}. Ingredientes: {ingredientes}.
  Beneficios: {beneficios}. Precio: ${precio}.
  Descripción: {descripcion}
  ```
- Generar embedding del texto con `embed_text()`
- Almacenar en ChromaDB collection "productos" con metadata:
  ```python
  {
      "source": "catalog",
      "brand": "L'Oréal",
      "category": "cuidado_facial",
      "skin_types": "seca,normal",
      "price": 450.0,
      "product_name": "Crema Hidratante Revitalift"
  }
  ```
- Un chunk por producto (no hace falta dividir)

**Verificación:** Ejecutar la ingesta, luego hacer `collection.count()` y `collection.peek()` para validar.

---

### Paso 4: Ingesta de guías (PDF)

**`backend/ingestion/chunking.py`:**
- Función `chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]`
- Divide por tokens aproximados (se puede usar split por palabras, ~1 token ≈ 0.75 palabras en español)
- Mantiene overlap entre chunks consecutivos para no perder contexto en los bordes

**`backend/ingestion/ingest_pdfs.py`:**
- Recorrer todos los PDFs en `data/guias/`
- Extraer texto de cada página con PyMuPDF (`fitz`)
- Concatenar todo el texto del PDF
- Aplicar `chunk_text()` para dividir en chunks
- Generar embeddings en batch
- Almacenar cada chunk en ChromaDB collection "guias" con metadata:
  ```python
  {
      "source": "guide",
      "filename": "guia_cuidado_facial.pdf",
      "page": 3
  }
  ```

**Verificación:** Ingestar un PDF de prueba, verificar que los chunks están en ChromaDB con metadata correcta.

---

### Paso 5: CLI de ingesta unificado

**`backend/ingestion/run_ingestion.py`:**
- Script que ejecuta `ingest_csv` + `ingest_pdfs` en secuencia
- Imprime conteos: "Productos ingresados: X", "Chunks de guías ingresados: Y"
- Ejecutar con: `cd backend && python -m ingestion.run_ingestion`

---

### Paso 6: Retriever con metadata filtering

**`backend/rag/retriever.py`:**
- Dos funciones principales:
  - `retrieve_products(query_embedding: list[float], filters: dict | None = None, top_k: int = 6) -> list[dict]`
    - Busca en collection "productos"
    - Si hay filtros (ej: `{"category": "cuidado_facial"}` o `{"skin_types": {"$contains": "grasa"}}`), aplicarlos con el parámetro `where` de ChromaDB
    - Retorna lista de dicts con: `text`, `metadata`, `score`
  - `retrieve_guides(query_embedding: list[float], top_k: int = 4) -> list[dict]`
    - Busca en collection "guias" por similaridad vectorial pura
    - Retorna lista de dicts con: `text`, `metadata`, `score`
- Función auxiliar `retrieve_all(query: str, filters: dict | None = None) -> list[dict]`:
  - Genera embedding de la query
  - Llama a ambas funciones
  - Combina y ordena por score
  - Retorna top 10

**Verificación:** Queries manuales con y sin filtros retornan resultados relevantes.

---

### Paso 7: Prompt templates y pipeline RAG

**`backend/rag/prompt_templates.py`:**

System prompt:
```
Eres un experto asistente de ventas de cosmética. Tu rol es ayudar a los vendedores
a recomendar productos a sus clientes.

REGLAS:
- Solo recomienda productos que aparezcan en el contexto proporcionado
- Siempre incluye: nombre del producto, por qué lo recomiendas, tip de uso y precio
- Si no encuentras un producto adecuado en el contexto, dilo honestamente
- Responde siempre en español
- Sé conciso pero informativo

FORMATO DE RESPUESTA:
Para cada producto recomendado incluye:
- **Producto**: nombre
- **Por qué**: razón relacionada al perfil del cliente
- **Tip de uso**: cómo aplicar o combinar
- **Precio**: $X
```

Incluir 2-3 few-shot examples mostrando el formato esperado.

Template de contexto:
```
--- PRODUCTOS RELEVANTES ---
{productos_recuperados}

--- GUÍAS Y CONOCIMIENTO INTERNO ---
{guias_recuperadas}
```

**`backend/rag/pipeline.py`:**
- Función principal: `async def generate_response(message: str, session_history: list[dict]) -> AsyncGenerator[str, None]`
- Flujo:
  1. Genera embedding de `message` con `embed_text()`
  2. Llama a `retrieve_all(message)` para obtener contexto
  3. Arma el prompt completo: system + few-shot + contexto + historial (últimos 3-4 turnos) + mensaje actual
  4. Llama al LLM con streaming via OpenAI SDK:
     ```python
     client = openai.OpenAI(base_url=settings.LLM_BASE_URL, api_key=settings.OPENROUTER_API_KEY)
     stream = client.chat.completions.create(
         model=settings.LLM_MODEL,
         messages=messages,
         stream=True
     )
     for chunk in stream:
         if chunk.choices[0].delta.content:
             yield chunk.choices[0].delta.content
     ```

**Verificación:** Llamar al pipeline con una consulta de prueba y verificar respuesta coherente.

---

### Paso 8: API Backend (FastAPI)

**`backend/api/models.py`:**
```python
class ChatRequest(BaseModel):
    message: str
    session_id: str

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str
```

**`backend/api/routes.py`:**
- `POST /chat` — Recibe `ChatRequest`, recupera historial de sesión (dict en memoria `{session_id: list[ChatMessage]}`), llama al pipeline, retorna SSE stream con `sse-starlette`. Después de completar, guarda el mensaje del usuario y la respuesta en el historial (máximo 4 turnos).
- `GET /health` — Retorna `{"status": "ok"}`

**`backend/api/main.py`:**
- FastAPI app
- CORS middleware permitiendo `http://localhost:5173` (dev server de SvelteKit)
- Incluir router de routes.py
- Al iniciar, cargar el modelo de embeddings (para que la primera consulta no sea lenta)

**Verificación:**
```bash
cd backend
uvicorn api.main:app --reload --port 8000
curl -N -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"recomienda crema para piel seca","session_id":"test"}'
```
Debe retornar stream SSE con la respuesta del LLM.

---

### Paso 9: Frontend SvelteKit

Inicializar proyecto:
```bash
cd "Sistema Rag"
npx sv create frontend  # skeleton project, SvelteKit, Svelte 5
cd frontend
npm install
```

**`src/lib/api.js`:**
- Función `streamChat(message: string, sessionId: string, onToken: (token: string) => void): Promise<void>`
- Hace `fetch('http://localhost:8000/chat', { method: 'POST', body: JSON.stringify({message, session_id: sessionId}) })`
- Lee el stream SSE con `response.body.getReader()` y un `TextDecoder`
- Por cada token recibido, llama a `onToken(token)`

**`src/lib/components/ChatMessage.svelte`:**
- Props: `role` ("user" | "assistant"), `content`
- Burbuja de mensaje con estilo diferenciado: usuario a la derecha, asistente a la izquierda
- Soportar markdown básico en las respuestas del asistente (negritas al menos)

**`src/lib/components/ChatInput.svelte`:**
- Input de texto + botón enviar
- Dispatch evento `send` con el mensaje
- Se deshabilita mientras se espera respuesta (prop `disabled`)
- Enter para enviar

**`src/routes/+page.svelte`:**
- Estado: `messages` (array de {role, content}), `isLoading`, `sessionId` (generado con `crypto.randomUUID()`)
- Al enviar mensaje:
  1. Agrega mensaje del usuario a `messages`
  2. Agrega mensaje vacío del asistente
  3. Llama a `streamChat()`, actualizando el content del último mensaje con cada token
  4. Al terminar, `isLoading = false`
- Scroll automático al fondo con cada nuevo token
- Diseño limpio y sencillo: header con título, área de mensajes scrollable, input fijo abajo

**Verificación:** `npm run dev`, abrir http://localhost:5173, enviar consulta, ver respuesta streaming.

---

### Paso 10: Pruebas end-to-end

Ejecutar todo junto:
```bash
# Terminal 1: Ingesta (una sola vez)
cd "Sistema Rag/backend"
python -m ingestion.run_ingestion

# Terminal 2: Backend
cd "Sistema Rag/backend"
uvicorn api.main:app --reload --port 8000

# Terminal 3: Frontend
cd "Sistema Rag/frontend"
npm run dev
```

Probar en navegador (http://localhost:5173):
1. **Consulta simple:** "Recomienda una crema hidratante para piel seca"
2. **Con contexto de cliente:** "Clienta de 40 años con piel mixta, busca rutina anti-edad, presupuesto de $1000"
3. **Multi-turno:** Hacer consulta → luego "¿y algo más económico?" → "¿tiene protección solar?"
4. **Consulta de guía:** "¿Cómo se aplica el ácido hialurónico?"
5. **Marca específica:** "¿Qué productos de L'Oréal tenemos para piel grasa?"

---

## Notas Importantes

- **Sin LangChain:** Todo es implementación directa. ChromaDB se usa con su SDK nativo, el LLM se llama con el SDK de OpenAI (compatible con OpenRouter/Kilo).
- **Embeddings locales:** El modelo `paraphrase-multilingual-MiniLM-L12-v2` se descarga la primera vez (~120MB) y corre en CPU. No necesita GPU ni API key.
- **OpenRouter/Kilo:** Ambos exponen una API compatible con OpenAI. Se usa `openai.OpenAI(base_url=..., api_key=...)` para conectar.
- **Sesiones en memoria:** El historial de conversación se guarda en un dict en memoria. Se pierde al reiniciar el servidor. Aceptable para desarrollo.
- **CORS:** El backend debe permitir requests desde `http://localhost:5173` (puerto default de SvelteKit dev).
- **Todo dentro de `Sistema Rag/`:** No crear archivos fuera de esta carpeta.

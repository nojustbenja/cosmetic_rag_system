# Sistema RAG para Tienda de Cosmética — Spec de Diseño

## Contexto

Los vendedores de una tienda de cosmética necesitan una herramienta que les ayude a hacer recomendaciones de productos con mayor seguridad y precisión cuando un cliente consulta. Actualmente dependen de su conocimiento personal, lo cual es inconsistente y limitado ante un catálogo de 100-500 productos.

**Objetivo:** Un sistema de chat donde el vendedor describe el perfil del cliente (tipo de piel, edad, necesidad, presupuesto) y recibe recomendaciones de productos fundamentadas en el catálogo y las guías internas de la tienda.

---

## Arquitectura General

```
Vendedor → [SvelteKit Chat UI] → [FastAPI Backend] → [RAG Pipeline] → [ChromaDB + LLM]
                                                            ↑
                                                  [CSV Productos + PDFs Guías]
```

### Capas del Sistema

1. **Ingesta de datos** — Procesa CSV de productos y PDFs de guías, genera embeddings, almacena en ChromaDB
2. **Motor RAG** — Recibe consultas, busca en ChromaDB con filtros de metadata, arma el prompt, llama al LLM
3. **API Backend** — FastAPI con endpoint de chat streaming (SSE)
4. **Frontend** — SvelteKit con interfaz de chat conectada vía SSE

---

## Stack Tecnológico

| Componente | Tecnología | Justificación |
|---|---|---|
| Vector DB | ChromaDB (local, persistente) | Zero infraestructura, suficiente para 500 productos, metadata filtering |
| Embeddings | `paraphrase-multilingual-MiniLM-L12-v2` (local) | Gratis, buen soporte español, sin costo de API |
| Framework RAG | Ninguno — implementación directa | Máximo control, menos dependencias, fácil de debuggear |
| PDF parsing | PyMuPDF (`fitz`) | Rápido, una sola dependencia, maneja bien la mayoría de PDFs |
| Backend | FastAPI + uvicorn | Async nativo, SSE fácil, tipado con Pydantic |
| LLM | Vía OpenRouter o Kilo API Gateway | API compatible OpenAI, acceso a múltiples modelos |
| Frontend | SvelteKit | Ligero, reactivo, fácil de personalizar |
| Streaming | Server-Sent Events (SSE) | Respuestas token-por-token en tiempo real |

---

## Estructura de Carpetas

```
Sistema Rag/
├── backend/
│   ├── requirements.txt
│   ├── .env                    # OPENROUTER_API_KEY, modelo, config
│   ├── config.py               # Configuración centralizada (pydantic-settings)
│   ├── ingestion/
│   │   ├── __init__.py
│   │   ├── ingest_csv.py       # Procesa catálogo → chunks con metadata
│   │   ├── ingest_pdfs.py      # Procesa PDFs → chunks con overlap
│   │   ├── chunking.py         # Estrategias de chunking por tipo
│   │   └── run_ingestion.py    # CLI entry point: python run_ingestion.py
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── embeddings.py       # Wrapper modelo sentence-transformers
│   │   ├── retriever.py        # ChromaDB query con metadata filtering
│   │   ├── prompt_templates.py # System prompts + few-shot examples
│   │   └── pipeline.py         # Orquesta: embed → retrieve → prompt → LLM
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
│   │   │   └── +page.svelte    # Página principal con chat
│   │   └── lib/
│   │       ├── components/
│   │       │   ├── ChatMessage.svelte
│   │       │   └── ChatInput.svelte
│   │       └── api.js          # Cliente SSE para streaming
│   └── static/
├── chroma_db/                  # Almacenamiento persistente (auto-generado)
└── docs/
```

---

## Componentes Detallados

### 1. Ingesta de Datos

#### Productos (CSV → ChromaDB)

Cada fila del CSV se convierte en un chunk de texto con metadata estructurada:

**Texto del chunk:**
```
Producto: Crema Hidratante Revitalift. Marca: L'Oréal. Categoría: Cuidado facial.
Tipo de piel: seca, normal. Ingredientes principales: ácido hialurónico, pro-retinol.
Beneficios: hidratación profunda, reduce líneas de expresión. Precio: $450.
```

**Metadata almacenada en ChromaDB:**
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

#### Guías/Manuales (PDF → ChromaDB)

- Extraer texto con PyMuPDF
- Dividir en chunks de ~800 tokens con ~100 tokens de overlap
- Preservar metadata: nombre del archivo fuente, número de página

### 2. Motor RAG

#### Embeddings (`embeddings.py`)
- Modelo: `paraphrase-multilingual-MiniLM-L12-v2` via `sentence-transformers`
- Carga el modelo una vez al iniciar la app, reutiliza para todas las consultas
- Dimensión del embedding: 384

#### Retriever (`retriever.py`)
- Búsqueda en ChromaDB con dos estrategias:
  - **Productos**: query con filtro de metadata (categoría, tipo_piel) + similaridad vectorial. Top 6 resultados.
  - **Guías**: query por similaridad vectorial pura. Top 4 resultados.
- Los filtros de metadata se extraen de la consulta del vendedor cuando son explícitos (ej: "piel grasa" → `skin_types contains "grasa"`)

#### Prompt Templates (`prompt_templates.py`)
- **System prompt**: Define el rol (experto en cosmética), reglas (solo recomendar del contexto, responder en español, incluir nombre+razón+tip+precio)
- **Few-shot examples**: 2-3 pares pregunta/respuesta que muestran el formato esperado
- **Template de contexto**: Sección de productos recuperados + sección de guías recuperadas

#### Pipeline (`pipeline.py`)
1. Recibe mensaje del vendedor + historial (últimos 3-4 turnos)
2. Genera embedding de la consulta
3. Ejecuta retrieval (productos + guías)
4. Arma el prompt completo: system + few-shot + contexto + historial + consulta
5. Llama al LLM vía OpenAI SDK (`openai.OpenAI(base_url=OPENROUTER_URL)`)
6. Retorna stream de tokens

### 3. API Backend

#### Endpoints
- `POST /chat` — Recibe `{message: string, session_id: string}`, retorna SSE stream
- `GET /health` — Health check

#### Sesiones
- Diccionario en memoria `{session_id: [últimos 4 mensajes]}`
- Sin persistencia (se pierden al reiniciar — aceptable para desarrollo local)

#### CORS
- Configurado para permitir requests desde el frontend Svelte (localhost:5173)

### 4. Frontend (SvelteKit)

#### Chat UI (`+page.svelte`)
- Input de texto para la consulta del vendedor
- Lista de mensajes (usuario + asistente) con scroll automático
- Indicador de "escribiendo..." mientras se recibe el stream
- Generación de session_id único por pestaña

#### Cliente SSE (`api.js`)
- Conecta al endpoint `/chat` de FastAPI
- Procesa tokens del stream y actualiza el estado reactivo de Svelte
- Manejo de errores y reconexión

#### Componentes
- `ChatMessage.svelte` — Burbuja de mensaje con estilo diferenciado usuario/asistente
- `ChatInput.svelte` — Input + botón enviar, deshabilitado mientras se espera respuesta

---

## Dependencias

### Backend (`requirements.txt`)
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

### Frontend (`package.json`)
```json
{
  "devDependencies": {
    "@sveltejs/adapter-static": "^3.0",
    "@sveltejs/kit": "^2.0",
    "svelte": "^5.0",
    "vite": "^6.0"
  }
}
```

---

## Configuración (`.env`)
```
OPENROUTER_API_KEY=sk-or-...
LLM_MODEL=anthropic/claude-3.5-sonnet
LLM_BASE_URL=https://openrouter.ai/api/v1
EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2
CHROMA_PERSIST_DIR=../chroma_db
```

---

## Verificación / Testing

1. **Ingesta**: Ejecutar `python run_ingestion.py` con datos de prueba (5-10 productos en CSV + 1 PDF). Verificar que ChromaDB tiene los chunks esperados.
2. **Retrieval**: Desde Python, hacer queries manuales a ChromaDB y validar que los resultados son relevantes y los filtros de metadata funcionan.
3. **Pipeline completo**: Enviar una consulta de prueba al pipeline y verificar que la respuesta del LLM es coherente y usa el contexto recuperado.
4. **API**: Probar el endpoint `/chat` con curl o httpie, verificar que el stream SSE funciona.
5. **Frontend**: Abrir la app Svelte, enviar una consulta, verificar que la respuesta aparece en streaming en el chat.
6. **Multi-turno**: Enviar una consulta seguida de un follow-up ("y algo más económico?") y verificar que el contexto de conversación se mantiene.

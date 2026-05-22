# Sistema RAG para Asesoramiento de Cosméticos 🧴

> **Un asistente inteligente impulsado por IA que potencia las recomendaciones de productos cosméticos con contexto, confianza y conocimiento experto.**

[![Estado del Proyecto](https://img.shields.io/badge/Estado-En%20Desarrollo%20Educativo-blue)](#)
[![Universidad](https://img.shields.io/badge/Universidad-San%20Sebastián-red)](#)
[![Taller](https://img.shields.io/badge/Taller-Innovación%20--%203er%20año-green)](#)
[![Licencia](https://img.shields.io/badge/Licencia-MIT-orange)](#)

---

## ¿Qué es Sistema RAG?

**Sistema RAG** (Retrieval-Augmented Generation) es una plataforma inteligente que revoluciona cómo los vendedores de cosméticos recomiendan productos a sus clientes. Combina **IA conversacional** con **búsqueda semántica** para filtrar un vasto conocimiento de cosméticos y deliverar recomendaciones precisas, contextuales y justificadas.

### El Problema

Los vendedores de cosméticos frecuentemente enfrentan:

- ❌ Falta de contexto sobre características de productos
- ❌ Incertidumbre al hacer recomendaciones personalizadas
- ❌ Inconsistencia en la calidad de asesoramiento
- ❌ Dificultad para justificar por qué cierto producto es ideal para un cliente
- ❌ Pérdida de confianza en la venta cuando no tienen fundamentos técnicos

### La Solución

Sistema RAG proporciona:

- ✅ **Recomendaciones contextuales**: Basadas en perfil de piel, necesidades específicas y productos disponibles
- ✅ **Justificación experta**: Cada recomendación incluye el "por qué" respaldado por datos
- ✅ **Guías y tutoriales**: Integración de PDFs educativos sobre uso y combinación de productos
- ✅ **Interfaz conversacional**: Un chat intuitivo que permite al vendedor hacer preguntas naturales
- ✅ **Confianza aumentada**: Vendedores pueden asesorar con seguridad fundamentada en datos

---

## 🎯 Valor Agregado

### Para Vendedores

- **Mayor confianza**: Respuestas respaldadas por datos y contexto
- **Eficiencia**: Obtén recomendaciones en segundos, no minutos
- **Consistencia**: Mismo nivel de asesoramiento en cada consulta
- **Educación continua**: Aprende sobre productos mientras interactúas con el sistema

### Para Clientes

- **Mejor experiencia**: Recomendaciones personalizadas y justificadas
- **Confianza en la venta**: Vendedores con seguridad proyectan profesionalismo
- **Soluciones ajustadas**: Productos recomendados para su tipo de piel específico
- **Ahorro de tiempo**: Menos tiempo decidiendo, más tiempo comprando

### Para el Negocio

- 📈 Incremento en ticket promedio (cross-selling inteligente)
- 🎯 Mayor conversión de consultas a ventas
- 📊 Base de conocimiento centralizada
- 🔄 Escalabilidad sin aumento proporcional de personal capacitado
- 💾 Datos para análisis de preferencias y tendencias

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript)             │
│  • Chat conversacional                                        │
│  • Carrito de compras                                         │
│  • Visualización de productos                               │
│  • BackOffice para gestión                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│         API REST (FastAPI + SSE Streaming)                   │
│  • /chat - Chat conversacional en tiempo real                │
│  • /products - Catálogo de productos                        │
│  • /admin - Gestión de datos                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
    ┌──────┐ ┌──────────┐ ┌──────────┐
    │ LLM  │ │ Embedder │ │ Retriever│
    │      │ │          │ │          │
    │(Multi│ │(Sentence │ │(Chroma   │
    │-     │ │Trans-    │ │DB)       │
    │Cloud)│ │formers)  │ │          │
    └──────┘ └──────────┘ └──────────┘
               │              │
               ▼              ▼
        ┌──────────────────────────────┐
        │    Vector Database (ChromaDB) │
        │  • Catálogo de productos     │
        │  • Guías PDF indexadas       │
        │  • Información técnica       │
        └──────────────────────────────┘
```

### Componentes Clave

#### 1. **Ingestion Pipeline** 📥

- **CSV Products**: Carga y parseo automático del catálogo
- **PDF Ingestion**: Extracción inteligente de guías y educativos
- **Chunking**: Fragmentación semántica para máxima relevancia
- **Embedding**: Conversión a vectores usando modelos multilingües

#### 2. **RAG Pipeline** 🔄

- **Retrieval**: Búsqueda semántica en base de vectores
- **Context Building**: Ensamblaje inteligente de contexto
- **Prompt Engineering**: Plantillas optimizadas con few-shot learning
- **Response Generation**: Respuestas coherentes usando LLM multi-cloud

#### 3. **Interfaz Conversacional** 💬

- **Streaming**: Respuestas en tiempo real (Server-Sent Events)
- **Session Management**: Historial de conversación por sesión
- **Smart Components**: Renderizado de productos y carrito integrado

#### 4. **Multi-LLM Support** 🤖

El sistema soporta múltiples proveedores de LLM:

- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google Gemini
- OpenRouter
- Kilo AI (con balanceo automático)
- LiteLLM (cualquier proveedor LLM)

**Auto-detección inteligente**: Selecciona automáticamente el provider según las claves API disponibles.

---

## 🚀 Características Principales

### MVP (Mínimo Viable)

- [X] Chat conversacional con asistente IA
- [X] Ingestion de catálogo de productos (CSV)
- [X] Ingestion de guías educativas (PDFs)
- [X] Búsqueda semántica contextual
- [X] Recomendaciones personalizadas por tipo de piel
- [X] Interfaz web responsiva
- [X] Carrito de compras
- [X] BackOffice básico

### Características Avanzadas

- [X] Streaming en tiempo real del chat
- [X] Análisis de razones de recomendación (skin type, category, benefits)
- [X] Integración con Supabase (para futuro almacenamiento de órdenes)
- [X] Múltiples LLM providers configurables
- [X] Soporte multilingüe (enfoque en español)
- [X] Historial de sesiones
- [X] Renderizado de markdown en respuestas

## 🛠️ Stack Tecnológico

### Backend

```
FastAPI              - Framework web moderno en Python
Uvicorn              - Servidor ASGI de alto rendimiento
ChromaDB             - Vector database para embeddings
Sentence-Transformers- Modelos de embeddings multilingües
PyMuPDF              - Procesamiento de PDFs
Pydantic             - Validación de datos con tipos
Python-dotenv        - Gestión de variables de entorno
SSE-Starlette        - Streaming de respuestas en tiempo real
```

### Frontend

```
React 19             - Librería UI declarativa
TypeScript           - Type safety
Vite                 - Build tool ultrarrápido
TailwindCSS          - Utility-first CSS
Shadcn Components    - Componentes UI profesionales
Radix UI             - Accesibilidad integrada
React Query          - State management de datos
React Router         - Routing de aplicación
Supabase JS          - Cliente para futuras integraciones
```

### Base de Datos & Vector Search

```
ChromaDB             - Vector store persistente
CSV (actualmente)    - Catálogo de productos
SQLite (ChromaDB)    - Persistencia local
Supabase (futuro)    - Backend completo opcional
```

### DevOps

```
Docker               - Containerización
Bash Scripts         - Automatización de inicio
Environment Variables- Configuración flexible
```

---

## 📋 Tabla de Contenidos

- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Cómo Usar](#-cómo-usar)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Flujo de Datos](#-flujo-de-datos)
- [API Reference](#-api-reference)
- [Contribuir](#-contribuir)
- [Contexto Educativo](#-contexto-educativo)
- [FAQ](#-faq)

---

## 💻 Instalación

### Requisitos Previos

- Python 3.10+
- Node.js 18+
- Bun (recomendado para frontend) o npm
- Git

### Opción 1: Instalación Rápida

```bash
# Clonar repositorio
git clone <repo-url>
cd "Sistema Rag"

# Ejecutar script de inicio (Linux/macOS)
./start.sh
```

### Opción 2: Instalación Manual

#### Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Ingestion inicial de datos
python -m ingestion.run_ingestion

# Iniciar servidor
python -m api.main
# O con uvicorn directamente:
# uvicorn api.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Con Bun (recomendado)
bun install
bun run dev

# O con npm
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:5173`
El backend estará disponible en `http://localhost:8000`

---

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` en la carpeta `backend/`:

```env
# LLM Configuration
LLM_PROVIDER=kilo  # Options: kilo, openai, claude, gemini, openrouter, litellm

# API Keys (elige según tu provider)
KILO_API_KEY=your_kilo_key_here
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
GEMINI_API_KEY=your_gemini_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
LITELLM_API_KEY=your_litellm_key_here

# LLM Model (si usas provider específico)
LLM_MODEL=gpt-4-turbo
LLM_BASE_URL=https://api.openai.com/v1

# Kilo Specific
KILO_MODE=general  # Balance between cost and quality

# Model for Embeddings
EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2

# Database
CHROMA_PERSIST_DIR=../chroma_db

# Frontend
FRONTEND_ORIGIN=http://localhost:5173
```

### Seleccionar LLM Provider

El sistema detecta automáticamente el provider más adecuado basado en las claves disponibles:

```python
if gemini_api_key:
    return "gemini"
elif anthropic_api_key:
    return "claude"
elif openai_api_key:
    return "openai"
elif openrouter_api_key:
    return "openrouter"
elif kilo_api_key:
    return "kilo"
```

---

## 📖 Cómo Usar

### 1. Preparar Datos

#### Catálogo de Productos (CSV)

Archivo: `backend/data/productos.csv`

Estructura requerida:

```csv
name,category,description,price,skin_types,benefits
"Hidratante Revitalift",moisturizer,"Crema hidratante enriquecida",12990,"seca,mixta","Hidratación,Anti-edad"
"Limpiador Suave",cleanser,"Gel limpiador sin sulfatos",8990,"sensible,grasa","Limpieza,Calmante"
```

#### Guías Educativas (PDFs)

Carpeta: `backend/data/guias/`

Coloca PDFs sobre:

- Rutinas de cuidado por tipo de piel
- Combinación de productos
- Tips de aplicación
- Ingredientes activos

### 2. Cargar Datos

```bash
cd backend
python -m ingestion.run_ingestion
```

Esto:

- Procesa el CSV y crea embeddings
- Lee todos los PDFs de la carpeta guias/
- Soluciona los chunks y los indexa en ChromaDB
- Imprime cantidad de productos y chunks capturados

### 3. Iniciar la Aplicación

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn api.main:app --reload

# Terminal 2: Frontend  
cd frontend
bun run dev
```

### 4. Usar el Sistema

Abre `http://localhost:5173` en tu navegador:

1. **Chat**: Escribe una consulta como cliente

   - "Tengo piel seca, ¿qué me recomiendas?"
   - "Busco algo para anti-edad"
   - "Combina estos productos para una rutina matutina"
2. **Productos**: Ve el catálogo completo
3. **Carrito**: Agrega productos (usa /admin para generar orden)
4. **Admin**: Gestiona productos manualmente si es necesario

---

## 📁 Estructura del Proyecto

```
Sistema Rag/
├── README.md                          # Este archivo
├── start.sh                           # Script de inicio rápido
├── start-backend.sh                   # Inicio solo backend
├── start-frontend.sh                  # Inicio solo frontend
├── skills-lock.json                   # Definición de skills
│
├── backend/
│   ├── .env                           # Configuración (no versionado)
│   ├── config.py                      # Configuración centralizada
│   ├── requirements.txt               # Dependencias Python
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py                    # Aplicación FastAPI
│   │   ├── models.py                  # Pydantic models
│   │   ├── routes.py                  # Endpoints de la API
│   │   └── ...
│   │
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── embeddings.py              # Generador de embeddings
│   │   ├── llm_client.py              # Cliente multi-LLM
│   │   ├── pipeline.py                # Pipeline RAG principal
│   │   ├── prompt_templates.py        # Prompts y system messages
│   │   ├── retriever.py               # Búsqueda en ChromaDB
│   │   └── ...
│   │
│   ├── ingestion/
│   │   ├── __init__.py
│   │   ├── chunking.py                # Lógica de chunking
│   │   ├── ingest_csv.py              # Ingestion de productos
│   │   ├── ingest_pdfs.py             # Ingestion de guías
│   │   ├── run_ingestion.py           # Orquestación de ingestion
│   │   └── ...
│   │
│   └── data/
│       ├── productos.csv              # Catálogo de productos
│       ├── orders.json                # Órdenes guardadas
│       └── guias/                     # PDFs educativos
│
├── frontend/
│   ├── package.json                   # Dependencias Node
│   ├── tsconfig.json                  # Configuración TypeScript
│   ├── vite.config.ts                 # Configuración Vite
│   ├── tailwind.config.ts             # Estilos TailwindCSS
│   │
│   ├── src/
│   │   ├── main.tsx                   # Punto de entrada
│   │   ├── App.tsx                    # Componente raíz
│   │   ├── App.css                    # Estilos globales
│   │   │
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx          # Chat conversacional
│   │   │   ├── ProductCard.tsx        # Tarjeta de producto
│   │   │   ├── CartDrawer.tsx         # Carrito de compras
│   │   │   ├── Markdown.tsx           # Renderizado de markdown
│   │   │   ├── ProductStage.tsx       # Vitrina de productos
│   │   │   ├── ReceiptModal.tsx       # Modal de recibo
│   │   │   └── ui/                    # Shadcn components
│   │   │
│   │   ├── pages/
│   │   │   ├── Index.tsx              # Página principal
│   │   │   ├── BackOffice.tsx         # Panel administrativo
│   │   │   └── NotFound.tsx           # 404
│   │   │
│   │   ├── hooks/
│   │   │   ├── useCart.tsx            # Estado del carrito
│   │   │   ├── useProfile.tsx         # Perfil de usuario
│   │   │   └── use-mobile.tsx         # Detección mobile
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts                 # Cliente HTTP
│   │   │   ├── format.ts              # Utilidades de formato
│   │   │   ├── images.ts              # Procesamiento de imágenes
│   │   │   └── utils.ts               # Helpers generales
│   │   │
│   │   ├── types/
│   │   │   └── shop.ts                # Tipos TypeScript
│   │   │
│   │   └── test/
│   │       ├── example.test.ts        # Tests de ejemplo
│   │       └── setup.ts               # Setup de tests
│   │
│   └── supabase/
│       ├── config.toml                # Configuración Supabase
│       └── functions/                 # Edge functions (futuro)
│
└── chroma_db/
    ├── chroma.sqlite3                 # Base de datos vectorial
    └── [collection_ids]/              # Colecciones de embeddings
```

---

## 🔄 Flujo de Datos

### Flujo de Ingestion

```
CSV/PDF Input
    ↓
Ingestion Module (ingestion/)
    ├─→ Parsing (lectura de archivos)
    ├─→ Chunking (fragmentación semántica)
    ├─→ Metadata Extraction (extracción de metadatos)
    └─→ Embedding (conversión a vectores)
    ↓
ChromaDB (almacenamiento vectorial)
```

### Flujo de Recomendación (Usuario)

```
User Query (chat input)
    ↓
Session Manager (historial de conversación)
    ↓
LLM Context Building
    ├─→ Retriever (búsqueda semántica en ChromaDB)
    ├─→ Context Assembly (armar contexto relevante)
    └─→ Prompt Templates (inyectar contexto + few-shot)
    ↓
LLM Pipeline (multi-cloud LLM)
    ├─→ Select Provider (OpenAI, Claude, Gemini, etc)
    ├─→ Stream Response (SSE)
    └─→ Analyze Recommendations (reason extraction)
    ↓
Response Streaming (EventSource)
    ↓
Frontend Rendering (markdown + components)
```

---

## 🔌 API Reference

### Endpoints Disponibles

#### Health Check

```http
GET /health
```

**Respuesta**: `{"status": "ok"}`

#### Obtener Todos los Productos

```http
GET /products
```

**Respuesta**:

```json
[
  {
    "id": "prod_001",
    "name": "Hidratante Revitalift",
    "category": "moisturizer",
    "description": "Crema hidratante enriquecida",
    "price": 12990,
    "skin_types": ["seca", "mixta"],
    "benefits": ["Hidratación", "Anti-edad"]
  }
]
```

#### Chat Conversacional (Streaming)

```http
POST /chat
Content-Type: application/json

{
  "message": "Tengo piel seca, ¿qué me recomiendas?",
  "session_id": "user_123"
}
```

**Respuesta**: Server-Sent Events (streaming)

```
data: {"chunk": "Te recomiendo..."}
data: {"chunk": " productos especializados"}
data: {"complete": true, "metadata": {...}}
```

#### AI Assistant (Streaming)

```http
POST /ai-assist
Content-Type: application/json

{
  "query": "Combina estos productos",
  "session_id": "user_123"
}
```

#### Obtener Contexto Recuperado

```http
POST /context
Content-Type: application/json

{
  "query": "Hidratante para piel seca",
  "limit": 5
}
```

**Respuesta**:

```json
{
  "items": [
    {
      "id": "...",
      "text": "...",
      "metadata": {...},
      "score": 0.92
    }
  ]
}
```

#### Crear/Gestionar Órdenes

```http
POST /orders
Content-Type: application/json

{
  "session_id": "user_123",
  "items": [
    {"product_id": "prod_001", "quantity": 1}
  ]
}
```

---

## 🤝 Contribuir

Este es un **proyecto educat educativo colaborativo**. Si quieres contribuir:

### 1. Configurar Entorno de Desarrollo

```bash
# Fork el repositorio
git clone <tu-fork>
cd "Sistema Rag"

# Crear rama de feature
git checkout -b feature/tu-nombre-feature

# Instalar herramientas de desarrollo
cd backend && pip install -r requirements.txt
cd frontend && bun install
```

### 2. Convenciones

- **Python**: PEP 8, type hints, docstrings
- **TypeScript**: ESLint, Prettier, interfaces bien tipadas
- **Commits**: Mensajes descriptivos en inglés
- **Pull Requests**: Descripción clara del cambio y testing

### 3. Testing

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
bun test
bun test:watch
```

### 4. Enviar Cambios

```bash
git add .
git commit -m "feat: descripción clara del cambio"
git push origin feature/tu-nombre-feature
# Luego crear PR desde GitHub
```

### Áreas Donde Puedes Contribuir

- 🐛 **Bug Fixes**: Encontraste un error? ¡Corrígelo!
- ✨ **Features**: Nuevas funcionalidades o mejoras
- 📚 **Documentación**: Mejorar README, docstrings, guías
- 🧪 **Testing**: Aumentar cobertura de tests
- 🎨 **UI/UX**: Mejorar interfaz y experiencia
- 🚀 **Performance**: Optimizaciones de speed
- 🌐 **i18n**: Soporte para más idiomas

---

## 🎓 Contexto Educativo

### Asignatura

- **Universidad**: Universidad San Sebastián
- **Carrera**: Ingeniería (3er año)
- **Asignatura**: Taller de Innovación
- **Semestre**: 2026-1

### Objetivos Pedagógicos

Este proyecto enseña:

1. **Arquitectura de Sistemas**

   - Diseño de aplicaciones multi-capas
   - Separación de concerns (frontend, backend, RAG)
   - Comunicación entre servicios
2. **IA/ML**

   - Retrieval-Augmented Generation (RAG)
   - Embeddings y búsqueda semántica
   - Prompt Engineering
   - Integración con múltiples LLMs
3. **Desarrollo Full-Stack**

   - Backend: FastAPI, Python moderno
   - Frontend: React, TypeScript, componentes modernos
   - API REST + Streaming (SSE)
   - State management
4. **DevOps & Deployment**

   - Containerización (Docker)
   - Variables de entorno y configuración
   - Scripts de automatización
   - Gestión de dependencias
5. **Trabajo Colaborativo**

   - Git y control de versiones
   - Code review y comunicación
   - Documentación clara
   - Testing y validación

### Recursos para Aprender

```
📚 Recomendado leer antes de contribuir:
├── FastAPI Docs: https://fastapi.tiangolo.com/
├── React Docs: https://react.dev/
├── RAG Concepts: https://python.langchain.com/docs/use_cases/question_answering/
├── ChromaDB: https://docs.trychroma.com/
├── OpenAI API: https://platform.openai.com/docs/
└── TypeScript: https://www.typescriptlang.org/docs/
```

### Evaluación y Rúbrica

- **Funcionalidad** (40%): ¿Funciona correctamente?
- **Código** (30%): ¿Es limpio, mantenible y documentado?
- **Innovación** (20%): ¿Agrega valor o mejora el sistema?
- **Documentación** (10%): ¿Se entiende cómo usar?

---

## ❓ FAQ

### General

**P: ¿Es este proyecto solo educativo o en producción?**
R: Actualmente educativo, pero con potencial de ser usado en una tienda de cosméticos real si la aprovación la permite.

**P: ¿Necesito suscripción a OpenAI para usar esto?**
R: No obligatoriamente. Soportamos múltiples LLMs gratuitos tier: Gemini, Kilo AI ofertas gratuitas, y LiteLLM local.

**P: ¿Puedo usar mis propios productos?**
R: Sí, reemplaza `backend/data/productos.csv` con tu catálogo y ejecuta `python -m ingestion.run_ingestion`.

### Técnico

**P: ¿Cómo funciona la búsqueda semántica?**
R: Convertimos productos y queries a vectores usando Sentence-Transformers, luego buscamos los más similares en ChromaDB.

**P: ¿Qué tamaño máximo de PDF puedo ingestion?**
R: No hay límite teórico, pero PDFs muy grandes pueden tardar. Recomendamos <50MB por PDF.

**P: ¿El sistema funciona offline?**
R: Parcialmente. ChromaDB es local, pero la generación de respuestas LLM requiere conexión (a menos que uses LiteLLM en local).

**P: ¿Cómo se maneja la privacidad de datos?**
R: Actualmente todo es local. Los datos no se envían a proveedores LLM sin tu consentimiento explícito.

### Troubleshooting

**P: El chat no responde**
R: Verifica que:

- [ ] Backend está corriendo (`uvicorn api.main:app --reload`)
- [ ] API key del LLM está configurada en `.env`
- [ ] ChromaDB tiene datos (`python -m ingestion.run_ingestion`)

**P: Los productos no aparecen**
R: Ejecuta: `python -m ingestion.run_ingestion` desde la carpeta `backend`

**P: Error de CORS**
R: Asegúrate que `FRONTEND_ORIGIN` en `.env` coincide con tu puerto frontend (default 5173)

---

## 📞 Soporte

- **Issues**: Usa GitHub Issues para reportar bugs
- **Discussions**: Para preguntas y discusiones
- **Email**: Contacta al profesor del taller

---

## 📄 Licencia

Este proyecto está bajo una **Licencia Source-Available Personalizada + Commons Clause**.

**Documento formal**: Ver [LICENSE.md](LICENSE.md) para términos completos y detallados.

### Resumen Ejecutivo

#### ✅ Permitido
- Ver y estudiar el código fuente
- Usar localmente para educación/aprendizaje
- Modificar para uso personal
- Crear derivados con valor agregado
- Contribuir mejoras (pull requests)

#### ❌ No Permitido
- Vender el sistema como es (sin modificación significativa)
- Comercializar un recomendador RAG de cosméticos
- Usar sin acreditación a autores originales
- Redistribuir sin licencia

#### ⚠️ Obligaciones
- **Atribución obligatoria**: Debes dar crédito a la fuente original
- **Disclaimer**: Incluir notificación sobre responsabilidad
- **Mantener licencia**: Copias deben incluir LICENSE.md

### Disclaimer de Responsabilidad Completo

**Los autores originales NO son responsables por:**
- Errores en recomendaciones de productos
- Pérdidas económicas o de ventas
- Daño reputacional o de marca
- Vulnerabilidades de seguridad
- Cualquier daño derivado del uso

**Usas este software bajo tu propio riesgo. Lee [LICENSE.md](LICENSE.md) completamente.**

### Solicitar Autorización

Para comercializar, adaptar a otro sector, o negociar términos especiales:
- Contacta a los autores del proyecto
- Explica tu caso de uso
- Negocia licencia comercial si es necesario

---

<div align="center">

### 🚀 Hecho con ❤️ por estudiantes del Taller de Innovación

Última actualización: 2026-05-22

[⬆ Volver al inicio](#sistema-rag-para-asesoramiento-de-cosméticos-)

</div>

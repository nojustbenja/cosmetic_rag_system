# Sistema RAG para Asesoramiento de Cosméticos 🧴✨

> **Lumi — tu asesora de belleza con IA. Un sistema RAG completo que potencia las recomendaciones de productos cosméticos con contexto, datos reales y argumentos de venta concretos.**

[![Estado del Proyecto](https://img.shields.io/badge/Estado-En%20Desarrollo%20Educativo-blue)](#)
[![Universidad](https://img.shields.io/badge/Universidad-San%20Sebastián-red)](#)
[![Taller](https://img.shields.io/badge/Taller-Innovación%20--%203er%20año-green)](#)
[![Licencia](https://img.shields.io/badge/Licencia-Custom%20Source--Available%20%2B%20Commons%20Clause-red)](#)

---

## ¿Qué es Sistema RAG?

**Sistema RAG** (Retrieval-Augmented Generation) es una plataforma inteligente que revoluciona cómo los vendedores de cosméticos recomiendan productos a sus clientes. Combina **IA conversacional** con **búsqueda semántica** para filtrar un vasto conocimiento de cosméticos y entregar recomendaciones precisas, contextuales y justificadas.

En el centro de la experiencia está **Lumi**, la asesora de belleza IA del sistema. Lumi conversa con el vendedor, infiere el perfil del cliente a partir de la descripción, recupera los productos más relevantes del catálogo mediante búsqueda semántica vectorial (ChromaDB), y genera argumentos de venta específicos para cada situación.

### El Problema

Los vendedores de cosméticos frecuentemente enfrentan:

- ❌ Falta de contexto sobre características de productos
- ❌ Incertidumbre al hacer recomendaciones personalizadas
- ❌ Inconsistencia en la calidad de asesoramiento
- ❌ Dificultad para justificar por qué cierto producto es ideal para un cliente
- ❌ Pérdida de confianza en la venta cuando no tienen fundamentos técnicos
- ❌ Sin datos sobre qué preguntas hacen más los clientes

### La Solución

Sistema RAG con Lumi proporciona:

- ✅ **Recomendaciones contextuales**: Basadas en perfil inferido del cliente, necesidades específicas y catálogo disponible
- ✅ **Argumento de venta generado por IA**: Cada tarjeta de producto incluye el "por qué venderlo" generado por Lumi
- ✅ **Fuentes RAG transparentes**: El vendedor ve de qué documento o entrada del catálogo provino la recomendación
- ✅ **Sugerencias inteligentes en tiempo real**: Rail de preguntas segmentadas por Trending / Frecuentes / Casos específicos
- ✅ **Analíticas de preguntas**: Datos de impresiones, clics, conversiones y tasa de parada por pregunta
- ✅ **Carrito de venta y tickets**: Flujo completo desde recomendación hasta ticket de venta imprimible
- ✅ **BackOffice completo**: Gestión de órdenes, catálogo, CSV, preguntas y proveedor LLM

---

## ⚡ Características Principales

### 🤖 Lumi — Asesora de Belleza IA
- Chat conversacional con streaming en tiempo real (SSE)
- Infiere automáticamente el **perfil del cliente** (tipo de piel, preocupación, momento de uso, familia de fragancia, presupuesto, sensibilidad) a partir de la conversación
- Muestra la **ficha de cliente** construida progresivamente, con campos faltantes para completar
- Modo profiler: cuando no hay suficiente perfil, Lumi hace preguntas para recopilarlo
- Modo recomendador: cuando hay perfil, activa el pipeline RAG y retorna productos + argumento

### 💡 Rail de Sugerencias Inteligentes
- Preguntas sugeridas clasificadas en **Trending**, **Frecuentes** y **Casos específicos**
- Paginación animada con flechas izquierda/derecha y transición fluida entre páginas
- Filtros de sección activables desde el mismo rail (toggle Trending / Frecuentes)
- Preguntas con ícono 🔥 cuando son tendencia activa
- Responsive: muestra 1–5 chips según el ancho disponible (ResizeObserver)
- Registro automático de impresiones por chip mostrado al usuario

### 📊 Sistema de Analíticas de Preguntas
- Registro de eventos por tipo: `impression`, `click`, `sent`, `answered`, `stop`, `product_view`, `cart_add`, `checkout`
- Score ponderado por evento con multiplicador de recencia (las preguntas recientes pesan más)
- Construcción automática de índice de **trending** y **FAQ** por semana o mes
- KPIs disponibles: preguntas enviadas, respondidas, impresiones, clics, CTR del chip, paradas
- Búsqueda de preguntas por texto normalizado (sin tildes, sin stopwords)
- Ventana máxima de 5.000 eventos almacenados localmente en `question_events.json`

### 🃏 Tarjetas de Producto Expandibles
- Bento grid con hero card para el primer producto y tarjetas estándar para el resto
- Badge de **match calibrado** (cosine similarity → escala visual 60–99%)
- Badge "Recomendado por Lumi" en tarjetas provenientes de una consulta RAG
- **Argumento de venta de Lumi**: resumen generado on-demand que explica por qué el producto calza con el perfil detectado, con señales extraídas del historial
- **Fuentes RAG scrollables**: muestra el nombre del documento o entrada del catálogo que originó la recomendación
- Stock visible; botón desactivado si el producto está sin stock
- Click en la tarjeta abre modal de detalle con imagen grande, descripción, atributos completos, argumento Lumi y fuentes

### 🛒 Acciones de Venta desde la Tarjeta
Dentro del modal de detalle de producto (solo para productos recomendados por RAG):
- **Por qué este**: muestra el argumento de Lumi con frase sugerida para el cliente y tip de uso
- **Más barato**: encuentra la alternativa más económica de la misma categoría y tipo de piel
- **Premium**: sugiere el upgrade aspiracional dentro de la misma necesidad
- Cada acción incluye: título, producto alternativo (si aplica), nota para el vendedor, frase para el cliente y tip de uso

### 🛍️ Carrito de Venta Integrado
- Botón flotante siempre visible con total en CLP y contador de ítems
- Drawer lateral animado (spring de Framer Motion) con lista de productos, subtotales y total
- Control de cantidad por ítem (+ / −) y botón de eliminar
- Insights automáticos sobre el carrito: categorías, marcas principales
- Generación de ticket: abre modal con resumen de venta, nombre del cliente, número de ticket imprimible
- Registro de evento `checkout` en el sistema de analíticas al generar el ticket

### 🏛️ BackOffice Completo
Panel administrativo en `/admin` con seis secciones:

| Tab | Descripción |
|-----|-------------|
| 🛒 **Órdenes & Ventas** | Tabla de todas las órdenes con ticket ID, fecha, cliente, productos, estado y total. Confirmar pago o eliminar tickets pendientes. Métricas: ingresos confirmados, venta proyectada, ítems ordenados, tickets generados |
| 📈 **Preguntas** | Analíticas de preguntas con KPIs semanales/mensuales, tabla de trending y FAQ con scores, búsqueda de preguntas históricas |
| 📦 **Catálogo RAG** | Vista de todos los productos indexados en ChromaDB con imagen, precio, stock y tags |
| ➕ **Nuevo Producto** | Formulario completo con asistencia de IA: al ingresar nombre y marca, Lumi autocompleta descripción, ingredientes, beneficios, precio, stock, tags, tipo de piel y categoría |
| 📂 **Importar CSV** | Importación masiva por drag-and-drop o pegado de texto. Modos: `merge` (agregar) o `replace` (reemplazar catálogo completo). Re-indexa automáticamente en ChromaDB |
| ⚙️ **Proveedor IA** | Configuración en caliente del proveedor LLM: selector visual de proveedores disponibles, configuración de modelo, base URL, API key y modo Kilo. Botón de validación de conectividad antes de guardar |

### 🤝 Soporte Multi-Proveedor LLM
- Gemini (Google)
- OpenAI (GPT-4, GPT-3.5-turbo)
- Anthropic (Claude)
- OpenRouter
- Kilo AI (con modos `free` / `general` / `pro`)
- LiteLLM (cualquier proveedor OpenAI-compatible)
- **Auto-detección**: selecciona el proveedor activo según las claves disponibles en `.env`
- **Configuración runtime**: cambio de proveedor desde el BackOffice sin reiniciar el servidor

---

## 🎯 Valor Agregado

### Para Vendedores

- **Mayor confianza**: Argumentos de venta respaldados por datos y contexto
- **Eficiencia**: Recomendaciones en segundos con fuente trazable
- **Consistencia**: Mismo nivel de asesoramiento en cada consulta
- **Herramientas de cierre**: Alternativa barata / premium con un clic
- **Analíticas propias**: Saber qué preguntas son tendencia ayuda a preparar el discurso

### Para Clientes

- **Mejor experiencia**: Recomendaciones personalizadas y justificadas
- **Confianza en la venta**: Vendedores que citan fuentes proyectan profesionalismo
- **Soluciones ajustadas**: Productos filtrados por tipo de piel, preocupación y presupuesto

### Para el Negocio

- 📈 Incremento en ticket promedio (cross-selling inteligente via alternativa premium)
- 🎯 Mayor conversión de consultas a ventas (argumento de Lumi en cada tarjeta)
- 📊 Base de conocimiento centralizada y actualizable sin tocar código
- 🔄 Escalabilidad sin aumento proporcional de personal capacitado
- 💾 Datos de analíticas para análisis de preferencias y tendencias

---

## 🏗️ Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19 + TypeScript)               │
│  • ChatPanel — Lumi: chat SSE, perfil de cliente, sugerencias     │
│  • QuestionSuggestionRail — Trending / Frecuentes / Específicos   │
│  • ProductCard — bento grid, modal de detalle, acciones de venta  │
│  • CartDrawer — carrito, ticket, insights de compra               │
│  • BackOffice — órdenes, catálogo, CSV, analytics, providers      │
└──────────────────────┬───────────────────────────────────────────┘
                       │  REST + SSE
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│             API REST (FastAPI + SSE Streaming)                    │
│  POST /chat              — Chat SSE multi-evento                  │
│  POST /chat/reason       — Argumento de venta por producto        │
│  POST /chat/product-action — Acción: why_this / cheaper / premium │
│  GET  /products          — Catálogo desde ChromaDB               │
│  POST /products          — Crear producto (+ re-ingest)          │
│  PUT  /products          — Editar producto (+ re-ingest)         │
│  POST /products/import-csv — Importación masiva (+ re-ingest)    │
│  POST /products/ai-assist  — Autocompletar ficha con IA          │
│  GET  /orders            — Listado de órdenes                    │
│  POST /orders            — Crear orden / ticket                  │
│  PUT  /orders/{id}/status — Confirmar pago                       │
│  DELETE /orders/{id}     — Eliminar ticket pendiente             │
│  GET  /questions/suggestions — Rail de sugerencias               │
│  POST /questions/events  — Registrar evento de analítica         │
│  GET  /questions/stats   — KPIs y ranking de preguntas           │
│  GET  /questions/search  — Buscar preguntas históricas           │
│  GET  /provider-config   — Configuración activa del LLM          │
│  PUT  /provider-config   — Cambiar proveedor en runtime          │
│  POST /provider-config/validate — Validar conectividad           │
│  GET  /health            — Health check                          │
└──────────┬───────────────────────────────────────────────────────┘
           │
  ┌────────┴────────┐──────────────────────┐
  ▼                 ▼                      ▼
┌──────┐      ┌──────────┐          ┌──────────────┐
│ LLM  │      │ Embedder │          │  Analytics   │
│      │      │          │          │              │
│(Multi│      │(Sentence │          │ questions.py │
│-Cloud│      │Trans-    │          │ events.json  │
│)     │      │formers)  │          │ seed.json    │
└──────┘      └────┬─────┘          └──────────────┘
                   ▼
         ┌──────────────────────────────┐
         │    Vector Database (ChromaDB) │
         │  • Catálogo de productos      │
         │  • Guías PDF indexadas        │
         │  • Información técnica        │
         └──────────────────────────────┘
```

### Componentes Clave

#### 1. **Ingestion Pipeline** 📥

- **CSV Products**: Carga y parseo automático del catálogo desde `backend/data/productos.csv`
- **PDF Ingestion**: Extracción inteligente de guías y materiales educativos desde `backend/data/guias/`
- **Chunking**: Fragmentación semántica para máxima relevancia en recuperación
- **Embedding**: Conversión a vectores usando `paraphrase-multilingual-MiniLM-L12-v2` (multilingüe)
- **Re-ingestion automática**: Al crear, editar o importar productos desde el BackOffice, ChromaDB se re-indexa sin intervención manual

#### 2. **RAG Pipeline** 🔄

- **Intent Analyzer**: LLM analiza si el mensaje tiene suficiente perfil de cliente para recomendar (`has_enough_profile`)
- **Profile Extractor**: Extrae tipo de piel, preocupación, momento de uso, familia de fragancia, presupuesto y sensibilidad
- **Profiler Mode**: Si el perfil es incompleto, Lumi hace preguntas naturales para completarlo
- **Retrieval**: Búsqueda semántica en ChromaDB separando productos de guías
- **Context Assembly**: Los productos se emiten como eventos SSE individuales (progresivo)
- **Recommender Mode**: LLM genera respuesta textual con los productos como contexto
- **Product Reason Generator**: Sub-agente LLM especializado en argumentos de venta con señales de perfil

#### 3. **Interfaz Conversacional** 💬

- **Streaming SSE**: Eventos separados para `profile`, `product`, `context_done`, `token`, `done`, `error`
- **Session Management**: Historial de conversación por sesión (últimos 8 turnos en memoria)
- **Smart Components**: Renderizado de productos inline en el chat + ProductMentionGroup
- **Analytics Integration**: Cada acción del usuario (enviar, clic en chip, detener, ver producto, agregar al carrito, checkout) registra un evento

#### 4. **Sistema de Preguntas y Analíticas** 📈

- **Preguntas semilla** (`question_seed.json`): Base curada de preguntas clasificadas en `frequent`, `trending`, `specific`
- **Eventos de usuario** (`question_events.json`): Registro persistente de hasta 5.000 eventos
- **Score de tendencia**: Fórmula ponderada por tipo de evento y recencia exponencial (ventana de 72h)
- **Suggestions API**: Combina preguntas semilla con preguntas reales que surgieron orgánicamente del uso

#### 5. **Multi-LLM Support** 🤖

El sistema soporta múltiples proveedores de LLM:

- Google Gemini (Gemini 1.5 Flash, Pro)
- OpenAI (GPT-4, GPT-3.5-turbo)
- Anthropic (Claude 3.5 Sonnet, Haiku)
- OpenRouter
- Kilo AI (con balanceo automático por modo: free / general / pro)
- LiteLLM (cualquier proveedor compatible con la API de OpenAI)

**Auto-detección inteligente**: Selecciona automáticamente el provider según las claves API disponibles en el entorno (`.env` en el backend).

**Configuración en runtime**: El BackOffice permite cambiar el proveedor, modelo, base URL y API key sin reiniciar el servidor.

#### 6. **Seguridad y Gestión de API Keys (Frontend vs Backend)** 🔒

Es crucial entender la separación estricta de responsabilidades en la arquitectura del sistema para garantizar la seguridad de las API Keys (OpenAI, Gemini, Anthropic, etc.):

- **El Frontend NO almacena ni usa API Keys directamente**: Todo el código de React en la carpeta `frontend/` actúa **únicamente como interfaz de usuario**. No hay llamadas directas desde el navegador hacia las APIs de OpenAI o Gemini.
- **El Backend centraliza las credenciales**: Todas las claves se configuran de forma segura en el archivo `.env` dentro de la carpeta `backend/`, o se mantienen en memoria segura durante la configuración en "runtime" (en el proceso de FastAPI).
- **El formulario "Proveedor IA" en el BackOffice**: Aunque el usuario ingresa su *API Key* en la interfaz del frontend, esta no se guarda en el navegador ni se usa ahí. El frontend la envía de inmediato a través de una petición segura (`PUT /provider-config`) al **Backend**. Es el backend quien asume la responsabilidad de contactar a los distintos modelos de lenguaje.
- **Función Edge de Supabase (ai-shopper)**: Si se utiliza el componente de AI Shopper, este se ejecuta como un Edge Function en el servidor de Supabase (runtime de Deno), utilizando credenciales seguras (como `LOVABLE_API_KEY` vía `Deno.env`) fuera del alcance del navegador.

Esta arquitectura protege completamente tus credenciales, garantizando que el usuario final jamás tenga acceso a las API Keys en el código fuente de la página web.

---

## 🚀 Características Implementadas

### Core Conversacional
- [x] Chat conversacional con Lumi (streaming SSE)
- [x] Modo profiler — Lumi pregunta cuando el perfil está incompleto
- [x] Modo recomendador — RAG activado cuando hay suficiente perfil
- [x] Perfil del cliente inferido automáticamente y mostrado como ficha
- [x] Indicador de campos faltantes en la ficha del cliente
- [x] Botón de detener generación (AbortController)
- [x] Nueva conversación con reset de sesión y catálogo

### Sugerencias y Analíticas
- [x] Rail de sugerencias con paginación animada (Framer Motion)
- [x] Filtros por sección: Trending / Frecuentes (toggle)
- [x] Registro de impresiones, clics, enviadas, respondidas, paradas
- [x] Score de tendencia ponderado por tipo de evento y recencia
- [x] Búsqueda de preguntas históricas en el BackOffice
- [x] KPIs de preguntas en BackOffice (semanal / mensual)

### Catálogo y Productos
- [x] Ingestion de catálogo CSV con embeddings vectoriales
- [x] Ingestion de guías educativas PDF
- [x] Búsqueda semántica contextual en ChromaDB
- [x] Bento grid responsivo con hero card
- [x] Badge de match calibrado (60–99%)
- [x] Argumento de venta de Lumi en cada producto recomendado
- [x] Fuentes RAG scrollables (de dónde vino la recomendación)
- [x] Modal de detalle con acciones de venta: Por qué este / Más barato / Premium

### Carrito y Ventas
- [x] Carrito flotante con total siempre visible
- [x] Drawer lateral con lista, cantidades y subtotales
- [x] Insights de carrito (categorías, marcas)
- [x] Generación de ticket con número único
- [x] Modal de recibo imprimible
- [x] Registro de evento de checkout en analíticas

### BackOffice
- [x] Gestión de órdenes: confirmar pago, eliminar ticket pendiente
- [x] Métricas de órdenes en tiempo real
- [x] Vista del catálogo RAG activo con stock y tags
- [x] Edición de productos con re-indexación automática
- [x] Creación de productos con asistencia de IA (autocompletar ficha)
- [x] Importación masiva CSV (merge o replace) con re-indexación
- [x] Analytics de preguntas con tablas de trending y FAQ
- [x] Configuración de proveedor LLM en runtime con validación de conectividad

### Características Avanzadas
- [x] Múltiples LLM providers configurables (Gemini, OpenAI, Claude, OpenRouter, Kilo, LiteLLM)
- [x] Renderizado de markdown en respuestas del chat
- [x] Soporte de dark mode con sistema de tokens CSS
- [x] Animaciones con Framer Motion (spring, layout, AnimatePresence)
- [x] `prefers-reduced-motion` respetado en el rail de sugerencias

---

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
Shadcn / Radix UI    - Componentes UI accesibles
Framer Motion        - Animaciones declarativas premium
@phosphor-icons/react- Iconografía consistente
React Query          - State management de datos del servidor
React Router         - Routing de aplicación
Sonner               - Notificaciones toast
```

### Base de Datos & Vector Search

```
ChromaDB             - Vector store persistente (SQLite embebido)
CSV                  - Catálogo de productos (fuente de verdad)
JSON                 - Órdenes (orders.json) y eventos (question_events.json)
```

### DevOps

```
Docker               - Containerización (opcional)
Bash Scripts         - Automatización de inicio (start.sh)
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
- pnpm (recomendado para frontend) o bun
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

# Con pnpm (recomendado)
pnpm install
pnpm run dev

# O con bun
bun install
bun run dev
```

El frontend estará disponible en `http://localhost:5173`
El backend estará disponible en `http://localhost:8000`

---

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` en la carpeta `backend/`:

```env
# LLM Configuration
LLM_PROVIDER=gemini  # Options: gemini, openai, claude, openrouter, kilo, litellm

# API Keys (elige según tu provider)
GEMINI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
KILO_API_KEY=your_kilo_key_here

# LLM Model (si usas provider específico)
LLM_MODEL=gemini-1.5-flash
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai

# Kilo Specific
KILO_MODE=general  # free | general | pro

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

El proveedor también puede cambiarse en caliente desde el **BackOffice → Proveedor IA** sin necesidad de reiniciar el servidor.

---

## 📖 Cómo Usar

### 1. Preparar Datos

#### Catálogo de Productos (CSV)

Archivo: `backend/data/productos.csv`

Estructura requerida:

```csv
name,brand,category,description,price,stock,skin_types,benefits,ingredients,tags,image_url
"Hidratante Revitalift","L'Oréal",cuidado_facial,"Crema hidratante enriquecida",12990,30,"seca,mixta","Hidratación,Anti-edad","ácido hialurónico,vitamina B5","glow,hidratacion,dia",""
"Limpiador Suave","Cetaphil",limpieza,"Gel limpiador sin sulfatos",8990,50,"sensible,grasa","Limpieza,Calmante","glicerina,pantenol","limpieza,sensible,suave",""
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

- Procesa el CSV y crea embeddings para cada producto
- Lee todos los PDFs de la carpeta `guias/`
- Fragmenta los textos en chunks semánticos y los indexa en ChromaDB
- Imprime la cantidad de productos y chunks capturados

También puedes cargar datos directamente desde el BackOffice usando la importación CSV o creando productos manualmente con asistencia de IA.

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

1. **Chat con Lumi**: Describe el perfil del cliente usando lenguaje natural
   - "Tengo piel seca, ¿qué me recomiendas?"
   - "Busca algo para anti-edad de noche"
   - "Piel mixta, busca efecto glow para un evento, presupuesto hasta $20.000"
2. **Rail de sugerencias**: Selecciona preguntas frecuentes o en tendencia para iniciar consultas rápidas
3. **Tarjetas de producto**: Haz clic en cualquier tarjeta para ver el argumento de Lumi, las fuentes RAG y las acciones de venta
4. **Carrito**: Agrega productos con el botón `+` o desde el modal. Genera el ticket cuando tengas lista la selección
5. **BackOffice** (`/admin`): Gestiona órdenes, catálogo, analíticas y configuración del proveedor IA

---

## 📁 Estructura del Proyecto

```
Sistema Rag/
├── README.md                          # Este archivo
├── start.sh                           # Script de inicio rápido
├── start-backend.sh                   # Inicio solo backend
├── start-frontend.sh                  # Inicio solo frontend
│
├── backend/
│   ├── .env                           # Configuración (no versionado)
│   ├── config.py                      # Configuración centralizada
│   ├── requirements.txt               # Dependencias Python
│   │
│   ├── api/
│   │   ├── main.py                    # Aplicación FastAPI
│   │   ├── models.py                  # Pydantic models
│   │   └── routes.py                  # Todos los endpoints de la API
│   │
│   ├── rag/
│   │   ├── embeddings.py              # Generador de embeddings
│   │   ├── llm_client.py              # Cliente multi-LLM
│   │   ├── pipeline.py                # Pipeline RAG principal
│   │   ├── prompt_templates.py        # Prompts y system messages
│   │   ├── provider_config.py         # Gestión de proveedores LLM en runtime
│   │   └── retriever.py               # Búsqueda en ChromaDB
│   │
│   ├── ingestion/
│   │   ├── chunking.py                # Lógica de chunking
│   │   ├── ingest_csv.py              # Ingestion de productos (CRUD + bulk)
│   │   ├── ingest_pdfs.py             # Ingestion de guías PDF
│   │   └── run_ingestion.py           # Orquestación de ingestion
│   │
│   ├── analytics/
│   │   └── questions.py               # Motor de analíticas de preguntas
│   │
│   └── data/
│       ├── productos.csv              # Catálogo de productos (fuente de verdad)
│       ├── orders.json                # Órdenes guardadas
│       ├── question_seed.json         # Preguntas semilla curadas
│       ├── question_events.json       # Eventos de analítica (generado en runtime)
│       └── guias/                     # PDFs educativos
│
├── frontend/
│   ├── package.json                   # Dependencias Node
│   ├── tsconfig.json                  # Configuración TypeScript
│   ├── vite.config.ts                 # Configuración Vite
│   ├── tailwind.config.ts             # Estilos TailwindCSS
│   │
│   └── src/
│       ├── main.tsx                   # Punto de entrada
│       ├── App.tsx                    # Componente raíz con routing
│       ├── App.css                    # Estilos globales y tokens de diseño
│       │
│       ├── components/
│       │   ├── ChatPanel.tsx          # Chat + rail de sugerencias + perfil de cliente
│       │   ├── ProductCard.tsx        # Tarjeta de producto con acciones de venta
│       │   ├── CartDrawer.tsx         # Carrito de venta lateral
│       │   ├── Markdown.tsx           # Renderizado de markdown
│       │   ├── ProductStage.tsx       # Vitrina bento grid de productos
│       │   ├── ReceiptModal.tsx       # Modal de recibo de venta
│       │   ├── LumiStatus.tsx         # Indicador de estado del backend
│       │   └── ui/                    # Componentes Shadcn/Radix
│       │
│       ├── pages/
│       │   ├── Index.tsx              # Página principal (chat + catálogo)
│       │   ├── BackOffice.tsx         # Panel administrativo completo
│       │   └── NotFound.tsx           # 404
│       │
│       ├── hooks/
│       │   ├── useCart.tsx            # Estado global del carrito
│       │   ├── useProfile.tsx         # Perfil de usuario
│       │   └── use-mobile.tsx         # Detección mobile
│       │
│       ├── lib/
│       │   ├── api.ts                 # Cliente HTTP + helpers de SSE
│       │   ├── format.ts              # Utilidades de formato (CLP, etc.)
│       │   ├── images.ts              # Procesamiento de imágenes y fallback
│       │   └── utils.ts               # Helpers generales
│       │
│       └── types/
│           └── shop.ts                # Tipos TypeScript del dominio
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
    ├─→ Metadata Extraction (fuente, página, nombre, precio, etc.)
    └─→ Embedding (conversión a vectores con Sentence-Transformers)
    ↓
ChromaDB (almacenamiento vectorial persistente)
```

### Flujo de Recomendación (Usuario → Lumi → Productos)

```
User Query (chat input o chip de sugerencia)
    ↓
trackQuestionEvent("sent")                 ← registro de analítica
    ↓
POST /chat (SSE)
    ├─→ extract_client_profile()           ← perfil inferido por reglas
    ├─→ emit event: "profile"              ← frontend muestra ficha de cliente
    │
    ├─[sin perfil suficiente]─→
    │    ├─→ emit "context_done"           ← UI no espera productos
    │    └─→ generate_profiler_response()  ← Lumi hace preguntas
    │
    └─[con perfil]─→
         ├─→ retrieve_context()            ← búsqueda semántica en ChromaDB
         ├─→ emit "product" × N            ← tarjetas aparecen progresivamente
         ├─→ emit "context_done"           ← total de productos encontrados
         └─→ generate_recommender_response() ← LLM + contexto RAG (streaming)
    ↓
emit event: "token" × M                    ← texto aparece en tiempo real
emit event: "done"
    ↓
Frontend rendering
    ├─→ ProductCard bento grid (con match score)
    ├─→ ProductMentionGroup en el chat
    └─→ fetchProductReason() on-demand     ← argumento de venta por producto
```

### Flujo de Acción de Venta

```
Click "Por qué este" / "Más barato" / "Premium" en modal
    ↓
POST /chat/product-action
    ├─→ generate_product_action()
    │    ├─→ Para "cheaper": filtra catálogo por misma categoría y piel,
    │    │   ordena por precio < precio actual, toma el más alto
    │    └─→ Para "premium": filtra por misma categoría y piel,
    │        ordena por precio > precio actual, toma el más bajo
    ↓
Resultado: título, producto sugerido, nota para el vendedor,
           frase sugerida para el cliente, tip de uso
    ↓
Frontend muestra resultado inline en el modal
```

### Flujo de Analíticas de Preguntas

```
Chip mostrado al usuario → trackQuestionEvent("impression")
Chip clickeado          → trackQuestionEvent("click")
Consulta enviada        → trackQuestionEvent("sent")
Respuesta completada    → trackQuestionEvent("answered", product_ids)
Generación detenida     → trackQuestionEvent("stop")
Modal producto abierto  → trackQuestionEvent("product_view")
Producto al carrito     → trackQuestionEvent("cart_add")
Checkout completado     → trackQuestionEvent("checkout")

Todos los eventos → POST /questions/events → question_events.json
                                              (últimos 5.000 registros)

GET /questions/suggestions → build_question_index()
    ├─→ Filtra eventos de la semana actual
    ├─→ Agrupa por pregunta normalizada
    ├─→ Calcula score: Σ(peso_evento × multiplicador_recencia)
    ├─→ Combina semilla curada + preguntas orgánicas reales
    └─→ Devuelve lista ordenada por grupo: frequent, trending, specific

GET /questions/stats → KPIs semanales/mensuales para el BackOffice
```

---

## 🔌 API Reference

### Endpoints Disponibles

#### Health Check

```http
GET /health
```

**Respuesta**: `{"status": "ok"}`

---

#### Configuración del Proveedor LLM

```http
GET /provider-config
```

Devuelve configuración actual y lista de proveedores disponibles.

```http
PUT /provider-config
Content-Type: application/json

{
  "provider": "gemini",
  "model": "gemini-1.5-flash",
  "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
  "api_key": "your_api_key",
  "kilo_mode": ""
}
```

```http
POST /provider-config/validate
```

Valida la conectividad con el proveedor antes de guardar.

---

#### Obtener Todos los Productos

```http
GET /products
```

**Respuesta**:

```json
[
  {
    "id": "hidratante-revitalift",
    "name": "Hidratante Revitalift",
    "brand": "L'Oréal",
    "category": "cuidado_facial",
    "description": "Crema hidratante enriquecida",
    "price": 12990,
    "stock": 30,
    "skin_types": ["seca", "mixta"],
    "benefits": ["Hidratación", "Anti-edad"],
    "ingredients": ["ácido hialurónico", "vitamina B5"],
    "tags": ["glow", "hidratacion", "dia"],
    "image_url": ""
  }
]
```

#### Crear Producto

```http
POST /products
Content-Type: application/json

{
  "nombre": "Hidratante Revitalift",
  "marca": "L'Oréal",
  "categoria": "cuidado_facial",
  "precio": 12990,
  "stock": 30,
  "descripcion": "Crema hidratante enriquecida",
  "tipo_piel": "seca,mixta",
  "beneficios": "Hidratación,Anti-edad",
  "ingredientes": "ácido hialurónico,vitamina B5",
  "tags": "glow,hidratacion,dia",
  "image_url": ""
}
```

#### Actualizar Producto

```http
PUT /products
Content-Type: application/json

{
  "original_name": "Nombre Original del Producto",
  "nombre": "Nuevo Nombre",
  ...
}
```

#### Importar CSV Masivo

```http
POST /products/import-csv
Content-Type: application/json

{
  "csv_content": "name,brand,category,...\nProducto,Marca,...",
  "mode": "merge"
}
```

`mode`: `"merge"` agrega al catálogo existente, `"replace"` lo reemplaza completamente.

#### Autocompletar Ficha con IA

```http
POST /products/ai-assist
Content-Type: application/json

{
  "name": "Hidratante Revitalift",
  "brand": "L'Oréal"
}
```

**Respuesta**:

```json
{
  "descripcion": "...",
  "ingredientes": "...",
  "beneficios": "...",
  "precio": 12990,
  "stock": 30,
  "tags": "glow,hidratacion,dia",
  "tipo_piel": "seca,mixta",
  "categoria": "cuidado_facial"
}
```

---

#### Chat Conversacional (Streaming SSE)

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
event: profile
data: {"skin_type": "seca", "concern": "hidratacion", "category": "cuidado_facial", ...}

event: product
data: {"id": "...", "name": "...", "score": 0.85, "rag_source": "Catálogo de productos", ...}

event: product
data: {"id": "...", "name": "...", "score": 0.72, ...}

event: context_done
data: {"guides": [], "total": 2}

event: token
data: {"token": "Te recomiendo..."}

event: token
data: {"token": " estos productos..."}

event: done
data: {"ok": true}
```

#### Argumento de Venta por Producto

```http
POST /chat/reason
Content-Type: application/json

{
  "message": "Tengo piel seca",
  "product": {"id": "...", "name": "...", "benefits": [...], ...}
}
```

**Respuesta**:

```json
{
  "reason": "Este producto calza especialmente bien porque..."
}
```

#### Acción de Venta

```http
POST /chat/product-action
Content-Type: application/json

{
  "message": "Tengo piel seca",
  "product": {"id": "...", "name": "...", "price": 12990, ...},
  "action": "cheaper",
  "profile": {"skin_type": "seca", "concern": "hidratacion", ...}
}
```

`action`: `"why_this"` | `"cheaper"` | `"premium"`

**Respuesta**:

```json
{
  "action": "cheaper",
  "title": "Alternativa más barata",
  "product": {"name": "...", "price": 8990, ...},
  "seller_note": "Si el cliente quiere bajar presupuesto, ofrece...",
  "customer_phrase": "Te lo propongo porque encaja con lo que me contaste...",
  "usage_tip": "Confirma tolerancia y frecuencia de uso..."
}
```

---

#### Gestión de Órdenes

```http
GET /orders
```

```http
POST /orders
Content-Type: application/json

{
  "ticket_number": "T-2026-001",
  "client_name": "María González",
  "skin_type": "seca",
  "items": [
    {"id": "prod_001", "name": "Hidratante Revitalift", "price": 12990, "qty": 1}
  ],
  "total": 12990,
  "timestamp": "2026-05-25T23:00:00",
  "status": "pendiente"
}
```

```http
PUT /orders/{ticket_number}/status
Content-Type: application/json

{"status": "pagado"}
```

```http
DELETE /orders/{ticket_number}
```

Solo se pueden eliminar órdenes con estado `"pendiente"`.

---

#### Sistema de Preguntas y Analíticas

```http
GET /questions/suggestions
```

Devuelve lista de sugerencias clasificadas por grupo (`frequent`, `trending`, `specific`) ordenadas por score.

```http
POST /questions/events
Content-Type: application/json

{
  "event_type": "click",
  "session_id": "abc-123",
  "question": "Tengo piel mixta y quiero más luminosidad",
  "suggestion_id": "faq-piel-mixta-glow",
  "source": "chip_trending",
  "product_ids": []
}
```

Tipos de evento válidos: `impression`, `click`, `sent`, `answered`, `stop`, `product_view`, `cart_add`, `checkout`

```http
GET /questions/stats?period=week
```

`period`: `"week"` (últimos 7 días) | `"month"` (últimos 30 días)

**Respuesta**:

```json
{
  "period": "week",
  "kpis": {
    "questions_week": 45,
    "questions_month": 180,
    "chip_ctr": 0.32,
    "answered": 42,
    "impressions": 280,
    "clicks": 90,
    "stops": 3
  },
  "trending": [...],
  "faq": [...]
}
```

```http
GET /questions/search?q=piel+seca
```

**Respuesta**:

```json
{
  "results": [
    {
      "question": "Tengo piel seca, ¿qué me recomiendas?",
      "normalized": "piel seca recomiendas",
      "source": "events",
      "score": 8.4,
      "sent_count": 3,
      "answered_count": 3
    }
  ]
}
```

---

## 🤝 Contribuir

Este es un **proyecto educativo colaborativo**. Si quieres contribuir:

### 1. Configurar Entorno de Desarrollo

```bash
# Fork el repositorio
git clone <tu-fork>
cd "Sistema Rag"

# Crear rama de feature
git checkout -b feature/tu-nombre-feature

# Instalar herramientas de desarrollo
cd backend && pip install -r requirements.txt
cd ../frontend && bun install
```

### 2. Convenciones

- **Python**: PEP 8, type hints, docstrings
- **TypeScript**: ESLint, Prettier, interfaces bien tipadas
- **Commits**: Mensajes descriptivos en inglés con prefijo convencional (`feat:`, `fix:`, `docs:`)
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
- 🚀 **Performance**: Optimizaciones de velocidad y costos LLM
- 📊 **Analytics**: Ampliar el sistema de métricas de preguntas

---

## ❓ FAQ

### General

**P: ¿Es este proyecto solo educativo o está en producción?**
R: Actualmente educativo, pero con potencial de ser usado en una tienda de cosméticos real si la aprobación lo permite.

**P: ¿Necesito suscripción a OpenAI para usar esto?**
R: No obligatoriamente. Soportamos Gemini (tiene tier gratuito generoso), Kilo AI con plan gratuito, y LiteLLM para modelos locales.

**P: ¿Puedo usar mis propios productos?**
R: Sí. Reemplaza `backend/data/productos.csv` con tu catálogo, ejecuta `python -m ingestion.run_ingestion` o usa el BackOffice para importar CSV directamente.

**P: ¿Cómo se personalizan las preguntas del rail de sugerencias?**
R: Edita `backend/data/question_seed.json` con tus preguntas categorizadas como `frequent`, `trending` o `specific`. El sistema las mezcla con las preguntas que naturalmente hagan los usuarios.

### Técnico

**P: ¿Cómo funciona la búsqueda semántica?**
R: Convertimos productos y queries a vectores usando Sentence-Transformers multilingüe, luego buscamos los más similares en ChromaDB usando similitud de coseno. El score se calibra visualmente de 60% a 99% para que sea interpretable.

**P: ¿Qué tamaño máximo de PDF puedo ingestar?**
R: No hay límite teórico, pero PDFs muy grandes pueden tardar. Recomendamos < 50MB por PDF.

**P: ¿El sistema funciona offline?**
R: Parcialmente. ChromaDB es local, pero la generación de respuestas LLM requiere conexión (a menos que uses LiteLLM con un modelo local como Ollama).

**P: ¿Cómo se maneja la privacidad de datos?**
R: Actualmente todo es local. Los datos del catálogo y las analíticas no se envían a ningún servidor externo excepto las queries al API del LLM configurado.

**P: ¿Qué pasa si el sistema de analíticas crece mucho?**
R: El sistema mantiene automáticamente solo los últimos 5.000 eventos en `question_events.json`. Si necesitas retención mayor, el módulo `analytics/questions.py` es fácilmente extensible a una base de datos.

### Troubleshooting

**P: El chat no responde**
R: Verifica que:

- [ ] Backend está corriendo (`uvicorn api.main:app --reload`)
- [ ] API key del LLM está configurada en `.env` o en el BackOffice → Proveedor IA
- [ ] ChromaDB tiene datos (`python -m ingestion.run_ingestion`)

**P: Las sugerencias no cargan**
R: Verifica que `backend/data/question_seed.json` existe y tiene formato JSON válido. El sistema tiene fallback con preguntas hardcodeadas si el endpoint falla.

**P: Los productos no aparecen**
R: Ejecuta: `python -m ingestion.run_ingestion` desde la carpeta `backend`

**P: Error de CORS**
R: Asegúrate que `FRONTEND_ORIGIN` en `.env` coincide con tu puerto frontend (default 5173)

**P: La IA no autocompleta la ficha en el BackOffice**
R: Verifica que tienes un proveedor LLM configurado con API key válida. El endpoint `/products/ai-assist` usa el mismo cliente LLM que el chat.

---

## 📞 Soporte

- **Issues**: Usa GitHub Issues para reportar bugs
- **Discussions**: Para preguntas y discusiones
- **Email**: nojustbenja@gmail.com

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

### 🚀 Hecho con ❤️ por el team tilin Guillermo(@GuillermoSerrano132), Simon(@Simon-Aspee), Peña(@Chubiiii) y Benjamín(@nojustbenja)

Última actualización: 2026-05-26

[⬆ Volver al inicio](#sistema-rag-para-asesoramiento-de-cosméticos-)

</div>

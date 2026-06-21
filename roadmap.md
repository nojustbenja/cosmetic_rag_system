# Roadmap

Este documento contiene las tareas pendientes y futuras mejoras para el proyecto.

## Mejoras de Arquitectura RAG (Completadas ✅)

- [x] **Query Expansion (Multi-Query):** Generación de 3 variantes de cada pregunta, búsquedas paralelas y unificación de resultados antes del reranking.
- [x] **Enriquecimiento de Metadata (Guías):** Inyección de títulos y secciones dentro del texto de los chunks de las guías.
- [x] **Evaluación Sistemática (RAGAS):** Implementación del script `evaluate.py` para medir `context_precision`, `context_recall` y `faithfulness`.

## Próximos Pasos (En cola de espera 🚀)

- [x] **Frontend - Source Citations:** Mostrar en la interfaz de chat (UI) exactamente de qué guía o producto (y en qué página) sacó la información el RAG para darle más confianza al usuario.
- [x] **Sistema de Feedback (Pulgares arriba/abajo):** Agregar botones en la UI para que el usuario califique la respuesta y guardar eso en base de datos para armar un dataset real para RAGAS.
- [x] **Semantic Caching:** Cachear las respuestas de consultas repetidas (ej: "rutina de noche") para responder en milisegundos y ahorrar llamadas al LLM.
- [x] **Contexto Global de Perfil:** Inyección de perfil de usuario estructurado (tipo de piel, alergias) persistente en los prompts para evitar repeticiones innecesarias.
- [x] **Mejora UX - Retención de Scroll:** Se implementó una retención del auto-scroll si el usuario mueve la vista durante la generación del mensaje, sumando un botón flotante para ir al final.

# Planning de diseño - RAG cosmetica

## Referencia analizada

Repositorio: https://github.com/nojustbenja/your-digital-shopping-guide

La referencia tiene una idea cercana a nuestro producto: un asistente conversacional de belleza que transforma una conversacion en recomendaciones de productos. No tiene RAG como fuente verificable, pero si tiene una direccion visual y de experiencia muy aprovechable.

Archivos revisados:
- `src/pages/Index.tsx`
- `src/components/ChatPanel.tsx`
- `src/components/ProductStage.tsx`
- `src/components/ProductCard.tsx`
- `src/components/MobileRecsSheet.tsx`
- `src/index.css`
- `tailwind.config.ts`

## Principios que vamos a adaptar

1. Chat como panel principal
   El vendedor debe sentir que conversa con un asesor experto, no que llena un formulario. El chat se mantiene como superficie dominante, con estado claro de actividad y respuesta en streaming.

2. Recomendaciones visibles como resultado
   Cuando el RAG recomienda productos, la UI no deberia dejar todo enterrado en texto. Debe existir un panel de productos recomendados con tarjetas escaneables: nombre, marca, precio, tipo de piel, razon y evidencia.

3. Diseño elegante pero operativo
   La referencia usa glassmorphism y una estetica editorial. Para tienda/vendedores conviene bajar un poco la fantasia y mantenerlo mas utilitario: vidrio suave, contraste alto, informacion clara, menos decoracion.

4. Chips de inicio y de contexto
   Los chips deben servir como atajos reales de trabajo: piel seca, piel grasa, anti-edad, presupuesto bajo, proteccion solar, rutina completa. Deben aparecer al inicio y tambien poder sugerirse segun el estado de la conversacion.

5. RAG visible y confiable
   A diferencia de la referencia, nuestro diferencial es que las recomendaciones vienen de catalogo y guias. La UI debe mostrar senales de respaldo: fuente, coincidencias relevantes, precio y guia usada cuando aplique.

## Layout propuesto

### Desktop

Pantalla dividida en dos zonas:

- Panel izquierdo: chat del asesor RAG.
- Panel derecho: recomendaciones y evidencias.

Proporcion recomendada:
- Chat: 420-480px fijo.
- Recomendaciones: espacio flexible.

El panel derecho tiene tres estados:
- Catalogo inicial: productos destacados o vacio util con filtros rapidos.
- Durante respuesta: skeletons o estado "buscando en catalogo".
- Recomendacion: tarjetas ordenadas por relevancia con razon y fuentes.

### Mobile

Chat ocupa toda la pantalla.

Las recomendaciones aparecen como:
- chip/boton flotante dentro del chat cuando hay resultados.
- bottom sheet con tarjetas de productos y evidencia.

## Componentes a crear o evolucionar

1. `RecommendationPanel.svelte`
   Panel derecho desktop. Muestra productos recuperados, razones, precios y fuentes.

2. `ProductRecommendationCard.svelte`
   Tarjeta de producto recomendada. Campos:
   - nombre
   - marca
   - precio
   - categoria
   - tipo de piel
   - razon RAG
   - chips de ingredientes/beneficios

3. `SourcesStrip.svelte`
   Banda compacta con contexto usado:
   - productos recuperados
   - guias consultadas
   - score o relevancia simplificada

4. `MobileRecommendationsSheet.svelte`
   Bottom sheet para mobile, inspirado en la referencia.

5. `QuickQuestionChips.svelte`
   Extraer los chips actuales de `+page.svelte` a componente propio.

## Cambios necesarios en backend/API

Actualmente `/chat` solo devuelve tokens SSE. Para alimentar el panel de recomendaciones, necesitamos enviar eventos SSE adicionales:

- `token`: texto del asistente.
- `context`: productos y guias recuperadas.
- `done`: fin de respuesta.
- `error`: errores.

Forma sugerida del evento `context`:

```json
{
  "products": [
    {
      "name": "Crema CeraVe Reparadora",
      "brand": "CeraVe",
      "price": 520,
      "category": "cuidado_facial",
      "skin_types": "seca,sensible",
      "benefits": "repara barrera, hidratacion prolongada",
      "reason": "Coincide con piel seca y necesidad de hidratacion",
      "source": "catalog"
    }
  ],
  "guides": [
    {
      "filename": "guia_cuidado_facial.pdf",
      "page": 3,
      "snippet": "..."
    }
  ]
}
```

## Direccion visual

Mantener:
- fondo claro y calmado
- paneles suaves con borde fino
- botones redondos para acciones iconicas
- chips compactos
- microanimacion al aparecer mensajes o recomendaciones

Evitar:
- exceso de blur que reduzca legibilidad
- gradientes dominantes
- tarjetas dentro de tarjetas
- hero/landing page
- texto decorativo que explique la app

Paleta sugerida:
- fondo: verde muy claro / gris calido
- texto: verde negro
- superficie: blanco translucido o blanco solido
- acento: verde profundo
- secundario: rosa muy suave solo para detalles cosmeticos

## Fases de implementacion

### Fase 1 - UI shell

- Convertir la pantalla actual en layout desktop de dos paneles.
- Mantener chat funcional.
- Extraer chips a componente.
- Agregar panel derecho con estado inicial "Catalogo consultable".

### Fase 2 - RAG visible

- Modificar backend para emitir evento SSE `context`.
- Actualizar cliente SSE para manejar `token`, `context`, `done` y `error`.
- Poblar panel derecho con productos recuperados.

### Fase 3 - Tarjetas de recomendacion

- Crear tarjetas de producto con razon, precio, tipo de piel e ingredientes.
- Diferenciar producto principal recomendado.
- Agregar fuentes/guia usada cuando exista.

### Fase 4 - Mobile

- Crear bottom sheet de recomendaciones.
- Mostrar chip "Ver recomendaciones" cuando haya resultados.
- Validar que input, chips y mensajes no se solapen.

### Fase 5 - Pulido

- Estados de carga.
- Empty states utiles.
- Mejora de copy para vendedores.
- Pruebas con consultas reales:
  - piel seca y presupuesto bajo
  - piel grasa con brillo
  - anti-edad 40+
  - proteccion solar sensible
  - follow-up: "algo mas economico"

## Resultado esperado

La app debe sentirse como una asesora RAG de cosmetica para vendedores: conversa, busca en catalogo, muestra recomendaciones accionables y deja claro por que cada producto aparece.


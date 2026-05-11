Now I have the full picture. Let me produce the judge report.

# Judge Report

## Scores
- Plan 1: 8/10

## Comparative Analysis
**Strengths**: Plan 1 is thorough, well-structured with clear phases, tasks, dependencies, and acceptance criteria. It correctly identifies the phased approach (layout → context events → cards → mobile sheet → polish). The edge cases and rollback plan are thoughtful. The self-critique about the `reason` field is honest and useful.

**Weaknesses**: 
- **Critical SSE parsing gap**: Plan claims the frontend should detect `data.products` or `data.guides` keys in the existing parse loop, but the actual frontend parser doesn't handle named SSE events properly — it splits on `\n\n` and looks for `data:` lines without checking the `event:` field. The plan glosses over this incompatibility.
- **Column mapping incomplete**: Plan mentions `product_name` → `name` mapping but the actual CSV uses `nombre`, `marca`, `tipo_piel`, `beneficios`, `precio`, `categoria`. The retriever metadata uses `product_name` but other fields need explicit mapping too.
- **Slightly verbose**: Some tasks have redundant detail (e.g., Task 5.2 is trivial and doesn't need its own task).
- **Missing**: No mention of updating the existing `ChatMessage.svelte` to potentially show inline product references or context indicators in the chat itself.

## Missing Steps
- Fix the SSE client to properly parse named event types (`event: context\ndata: {...}`) since the current implementation doesn't read the `event:` header line
- Map actual CSV column names (`nombre`, `marca`, `tipo_piel`, `beneficios`, `precio`) to the card schema
- Update `ChatMessage.svelte` (or chat flow) to indicate when RAG context was used (e.g., "Encontre X productos relevantes")
- Add the `context` event handling to the fallback (no-API-key) mode which already generates product-based responses
- Responsive breakpoint testing: the existing app has styles at different breakpoints that need to be reconciled with the new 900px split

## Contradictions
- Task 2.3 says "detect `data.products` or `data.guides` keys" but the backend uses named SSE events (e.g., `event: context`), meaning the frontend needs to parse the `event:` field first, not just inspect JSON keys
- Plan states "keep `build_context(retrieved_items)` call unchanged" but also splits retrieval out of `generate_response` — these interact: the function's internal flow must change
- "Estimated Tokens" field in each task is unclear in purpose — seems to estimate code size but is inconsistently applied

## Improvements
- Consolidate Phase 5 (polish) into earlier phases — skeletons belong with Phase 1, empty states with Phase 1
- Add explicit SSE protocol fix as a prerequisite task
- Include a data mapping table (CSV columns → card fields) in Phase 2
- Drop "Estimated Tokens" field — it adds no actionable value
- Add a Phase 0 or preparatory step for verifying dev environment runs correctly before starting

## Final Plan

# Plan

## Overview
Evolve the SvelteKit/FastAPI RAG chat into a two-panel seller-facing cosmetic recommendation assistant. The backend emits a new `context` SSE event with structured product/guide metadata before streaming LLM tokens. The frontend displays these as scannable recommendation cards in a side panel (desktop) or bottom sheet (mobile), making RAG evidence (price, skin type, reason, source) visible to the seller.

## Scope
- In:
  - Desktop split-panel layout (chat 460px left, recommendations flexible right)
  - Backend `context` SSE event with structured product/guide data
  - Frontend SSE client fix to properly handle named event types
  - `ProductRecommendationCard` component (name, brand, price, skin type, benefits, reason, source, score)
  - `RecommendationPanel` with empty/loading/results states and skeleton animations
  - `MobileRecommendationsSheet` bottom sheet for viewports ≤900px
  - `SourcesStrip` for guide evidence
  - Component extraction: `QuickQuestionChips`
  - Visual: soft panels, green accent palette, high contrast, minimal decoration

- Out:
  - Auth, multi-user, deployment
  - CSV schema changes or new product ingestion
  - LLM prompt modifications
  - PDF guide ingestion improvements
  - Marketing/landing page elements
  - Automated E2E test framework
  - Internationalization

## Phases

### Phase 1: Layout Shell & Component Extraction
**Goal**: Convert single-column chat to responsive two-panel desktop layout with loading/empty states built in from the start.

#### Task 1.1: Extract QuickQuestionChips component
- Location: `frontend/src/lib/components/QuickQuestionChips.svelte`
- Description: Move chip rendering from `+page.svelte` into standalone component.
- Dependencies: None
- Steps:
  - Create component with props: `questions: string[]`, `disabled: boolean`, `onSelect: (q: string) => void`
  - Move `.quick-actions` markup and styles from `+page.svelte`
  - Import and use in `+page.svelte`
- Acceptance Criteria:
  - Chips render and function identically to current behavior
  - No visual regression at mobile and desktop widths

#### Task 1.2: Create RecommendationPanel component
- Location: `frontend/src/lib/components/RecommendationPanel.svelte`
- Description: Right-side panel with three states: empty (initial message), loading (skeleton cards with pulse animation), results (card slots).
- Dependencies: None
- Steps:
  - Props: `products: array`, `guides: array`, `isLoading: boolean`
  - Empty state: "Consulta al asistente y los productos relevantes apareceran aqui" with subtle icon
  - Loading state: 3 CSS-only skeleton cards with pulsing animation + "Buscando en catalogo..." label
  - Results state: scrollable list area for cards + sources strip
  - No-results state (products arrived but empty): "No se encontraron productos que coincidan"
  - Style: white panel, thin border `#d8ddd7`, 16px padding, 12px border-radius, subtle box-shadow
- Acceptance Criteria:
  - All states render correctly and transition smoothly
  - Panel fills available flex space in parent container

#### Task 1.3: Convert +page.svelte to split-panel layout
- Location: `frontend/src/routes/+page.svelte`
- Description: Replace single-column `<main>` with flex two-column layout.
- Dependencies: Task 1.1, Task 1.2
- Steps:
  - Add state: `let recommendations = $state([])`, `let guides = $state([])`, `let contextLoading = $state(false)`
  - Wrap existing header + messages + footer into `.chat-panel` (width: 460px, flex-shrink: 0)
  - Add `<RecommendationPanel>` sibling in `.app-layout` flex container (row direction)
  - Add `@media (max-width: 900px)` to stack vertically and hide recommendation panel
  - Pass `recommendations`, `guides`, `contextLoading` as props
- Acceptance Criteria:
  - Desktop >900px: chat left (460px), recommendations right (flexible)
  - Mobile ≤900px: chat fills screen, panel hidden
  - Chat streaming remains fully functional

**Validation**: Run `npm run dev`, verify two-panel renders at 1280px, single-column at 375px. Quick chips and input functional.

### Phase 2: RAG Context Events
**Goal**: Emit structured retrieval results as a `context` SSE event and consume it in the frontend.

#### Task 2.1: Create retrieve_context function in pipeline
- Location: `backend/rag/pipeline.py`
- Description: Extract retrieval into a standalone function that returns structured data mapped from CSV columns to card-friendly schema.
- Dependencies: None
- Steps:
  - Create `retrieve_context(message: str) -> dict`:
    - Calls `retrieve_all(message)`
    - Maps each product item: `metadata["product_name"]` → `name`, `metadata["brand"]`/fallback from text → `brand`, `metadata["price"]` → `price`, `metadata["category"]` → `category`, `metadata["skin_types"]` → `skin_types` (split comma-separated string to list), `metadata["benefits"]` → `benefits`, `metadata["source"]` → `source`, `item["score"]` → `score`
    - Generates `reason` from metadata overlap: `f"Coincide con: {skin_types_overlap}"` based on query keyword matching against `skin_types` and `category`
    - Separates guides: items where `source != "catalog"` → `{"filename", "page", "snippet"}`
    - Returns `{"products": [...], "guides": [...]}`
  - Refactor `generate_response` to accept optional `retrieved_items` parameter (to avoid double retrieval)
- Acceptance Criteria:
  - `retrieve_context("piel seca")` returns dict with `products` list containing `name`, `brand`, `price`, `category`, `skin_types` (list), `benefits`, `reason`, `source`, `score`
  - Guides array has `filename`, `snippet` fields
  - `generate_response` still works unchanged when called from existing code paths

#### Task 2.2: Emit context SSE event in routes
- Location: `backend/api/routes.py`
- Description: Before streaming tokens, emit a named `context` event with retrieval results.
- Dependencies: Task 2.1
- Steps:
  - Import `retrieve_context` from pipeline
  - In `event_generator()`:
    1. Call `context_payload = retrieve_context(message)`
    2. Yield `{"event": "context", "data": json.dumps(context_payload)}`
    3. Pass the raw `retrieved_items` to `generate_response` to avoid duplicate retrieval
    4. Continue with existing `token`/`done`/`error` stream
  - Ensure fallback mode (no API key) also emits `context` event before fallback text
- Acceptance Criteria:
  - SSE stream order: `context` → `token`* → `done`
  - `curl` to `/chat` shows `event: context` with JSON products array
  - Fallback mode still works with context event emitted

#### Task 2.3: Fix frontend SSE client to handle named events
- Location: `frontend/src/lib/api.js`
- Description: Update SSE parser to read the `event:` field from SSE frames and dispatch to appropriate callbacks.
- Dependencies: Task 2.2
- Steps:
  - Refactor the SSE parsing loop to track both `event:` and `data:` lines per frame (frames separated by `\n\n`)
  - For each frame: extract event name (default "message" if absent), parse JSON data
  - Dispatch: `"context"` → call `onContext(data)`, `"token"` → call `onToken(data.token)`, `"done"` → resolve, `"error"` → reject
  - Update `streamChat` signature: `streamChat(message, sessionId, { onToken, onContext, onError })`
  - Update call site in `+page.svelte`:
    - Set `contextLoading = true` when sending
    - `onContext`: set `recommendations = data.products`, `guides = data.guides`, `contextLoading = false`
    - `onToken`: existing behavior (append to assistant message)
- Acceptance Criteria:
  - On query, `recommendations` state updates with product objects before text starts appearing
  - `RecommendationPanel` transitions from loading → cards
  - Existing token streaming unaffected
  - Error handling preserved

**Validation**: Run full stack. Submit "piel seca". Network tab shows `event: context` frame. Recommendation panel populates before text streams.

### Phase 3: Recommendation Cards
**Goal**: Render scannable product cards with full RAG evidence.

#### Task 3.1: Create ProductRecommendationCard component
- Location: `frontend/src/lib/components/ProductRecommendationCard.svelte`
- Dependencies: Task 2.3
- Steps:
  - Props: `product: { name, brand, price, category, skin_types, benefits, reason, source, score }`
  - Layout (top to bottom): name (bold, 1.1rem), brand (muted gray), price (prominent, green accent), skin type pills, benefits pills (secondary), reason text (italic, small), source badge, score indicator (percentage or bar)
  - Style: white bg, thin border, 12px border-radius, 16px padding, subtle hover elevation (translateY -2px + shadow)
  - Animate entrance: `transition:fly={{ y: 20, duration: 300 }}`
  - Long names: `overflow-wrap: anywhere`, max 2 lines with ellipsis
- Acceptance Criteria:
  - All fields render legibly
  - Price visually prominent
  - Skin type pills compact and scannable
  - Score/relevance visible as percentage badge

#### Task 3.2: Create SourcesStrip component
- Location: `frontend/src/lib/components/SourcesStrip.svelte`
- Dependencies: Task 2.3
- Steps:
  - Props: `guides: { filename, page, snippet }[]`
  - Render horizontal scrollable row of compact badges: "📄 {filename} p.{page}"
  - Tooltip on hover showing snippet text
  - Style: muted colors, small font (0.75rem), subtle border, no background
- Acceptance Criteria:
  - Guides appear below product cards
  - Each shows filename and page
  - Visually unobtrusive

#### Task 3.3: Integrate into RecommendationPanel
- Location: `frontend/src/lib/components/RecommendationPanel.svelte`
- Dependencies: Task 3.1, Task 3.2
- Steps:
  - Import both components
  - In results state: iterate `products`, render `ProductRecommendationCard` per item with stagger delay (50ms * index)
  - Below cards: render `SourcesStrip` with `guides`
  - Top card: add "Top recomendacion" badge if `score > 0.7`
- Acceptance Criteria:
  - "piel seca" query shows 2-3 product cards with correct data from CSV
  - Guide sources strip renders below
  - Loading → cards transition smooth

**Validation**: Query "rutina para piel seca". Verify cards show CeraVe/Bioderma products with price, skin types, relevance. Check guide strip if guides exist.

### Phase 4: Mobile Bottom Sheet
**Goal**: Surface recommendations on mobile via swipeable bottom sheet.

#### Task 4.1: Create MobileRecommendationsSheet component
- Location: `frontend/src/lib/components/MobileRecommendationsSheet.svelte`
- Dependencies: Task 3.1, Task 3.2
- Steps:
  - Props: `open: boolean`, `products: array`, `guides: array`, `onClose: () => void`
  - Structure: fixed backdrop (rgba black) + sheet container (max-height: 80vh, border-radius: 16px 16px 0 0, white bg)
  - Drag handle bar at top (decorative, 40px wide gray pill)
  - Scrollable content: product cards + sources strip
  - Close button (X) in top-right corner
  - Animation: CSS transform `translateY(100%)` → `translateY(0)` with transition 300ms ease
  - Z-index: 1100 (above chat footer)
  - Focus trap when open (tab key stays within sheet)
- Acceptance Criteria:
  - Sheet slides up smoothly
  - Products and guides render inside
  - Backdrop tap or close button dismisses
  - Does not interfere with chat when closed

#### Task 4.2: Add mobile trigger and wire up
- Location: `frontend/src/routes/+page.svelte`
- Dependencies: Task 4.1
- Steps:
  - Add `let showSheet = $state(false)`
  - Conditionally render floating pill button "Ver {recommendations.length} productos" above footer when `recommendations.length > 0` and viewport ≤900px
  - Use CSS `display: none` at >900px (no JS matchMedia needed)
  - On click: `showSheet = true`
  - Render `<MobileRecommendationsSheet open={showSheet} products={recommendations} guides={guides} onClose={() => showSheet = false} />`
- Acceptance Criteria:
  - Mobile after query: floating chip appears with count
  - Tap opens sheet with correct products
  - Sheet closes cleanly, chat functional
  - Button doesn't overlap input area (position above footer with margin)

**Validation**: DevTools responsive mode 375px. Submit query. Floating button appears. Tap opens sheet. Cards render. Close works.

## Testing Strategy
- **Backend unit test** (`backend/tests/test_context_event.py`):
  - Call `retrieve_context("piel seca")`, assert returns `{"products": [...], "guides": [...]}`
  - Assert each product has keys: `name`, `brand`, `price`, `category`, `skin_types`, `benefits`, `reason`, `source`, `score`
  - Assert `skin_types` is a list, `price` is numeric or string with `$`
- **Backend integration test**:
  - POST `/chat` with test message, parse SSE stream
  - Assert `event: context` precedes first `event: token`
  - Assert context JSON has non-empty `products` for known query
- **Frontend manual validation** (5 scenarios):
  1. "Rutina para piel seca con presupuesto bajo" → expect CeraVe, Bioderma cards
  2. "Producto para piel grasa" → expect Serum Niacinamida, Effaclar cards
  3. "Anti-edad para 40 anos" → expect Revitalift card
  4. "Protector solar piel sensible" → expect Anthelios card
  5. Follow-up "algo mas economico" → verify session context maintained
- **Responsive check**: 375px, 768px, 1280px widths. Layout switch at 900px. Bottom sheet only on mobile.
- **Edge case**: Query with no matches (e.g., "perfume masculino") → no-results empty state, no crash
- **Fallback mode**: Unset API key, verify context event still emits and cards populate

## Risks
| Risk | Mitigation |
|------|-----------|
| SSE event parsing mismatch (backend uses named events, frontend parsed data-only) | Task 2.3 explicitly rewrites the SSE parser to handle `event:` field — this is prerequisite to all frontend context work |
| CSV column names (`nombre`, `tipo_piel`) differ from card schema (`name`, `skin_types`) | Task 2.1 includes explicit mapping table; test asserts correct field names in output |
| `reason` field empty — retriever returns similarity scores, not explanations | Generate template reason from metadata overlap (`"Coincide con: piel seca, hidratacion"`). Full LLM-generated reasons are out of scope. |
| Mobile bottom sheet z-index conflicts with sticky footer | Sheet uses z-index 1100 (footer is < 100), fixed position overlay |
| Retrieval latency delays entire SSE stream | Local ChromaDB with in-memory embeddings is fast (<100ms). If slow, emit context async in future — not needed for local demo |
| No automated frontend tests | Components are props-driven and stateless; manual validation covers demo scenarios. Playwright smoke test is future work. |

## Rollback Plan
- Each phase is independently revertable (one commit per task)
- Phase 2 revert: remove `context` event from `routes.py` and `pipeline.py` — frontend gracefully handles missing `onContext` (panel stays empty, chat works)
- Phase 1 revert: restore single-column `+page.svelte` — new components exist but are unused
- Phase 4 revert: remove bottom sheet and trigger — desktop panel still works

## Edge Cases
- **Empty ChromaDB**: `retrieve_context` returns `{"products": [], "guides": []}`. Panel shows no-results state.
- **Long product names**: Card uses `overflow-wrap: anywhere` + 2-line clamp with ellipsis
- **Rapid successive queries**: `recommendations` state is overwritten (not appended) on each new context event
- **Network interruption mid-stream**: Existing error handling catches fetch failures. Panel stays in last known state.
- **Backend without API key**: Context event still emits (retrieval is LLM-independent). Cards populate. Chat text uses fallback.
- **Session with no history**: Works — empty history list, retrieval proceeds normally.
- **Products with missing fields** (e.g., no `brand` in metadata): Card renders gracefully with "—" or omits the field.

## Open Questions
- Should `reason` eventually be LLM-generated (extra inference call for structured output) or is metadata-derived matching sufficient for the demo?
- Should recommendations accumulate across messages (accordion of past results) or always replace with latest query's results?
- Should the chat bubble itself indicate "X productos encontrados" inline, linking to the panel?
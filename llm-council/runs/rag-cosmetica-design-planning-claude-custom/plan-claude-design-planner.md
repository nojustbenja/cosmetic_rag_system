I've read the full codebase. Here's the implementation plan:

# Plan

## Overview
Evolve the existing SvelteKit/FastAPI RAG chat into a two-panel seller-facing cosmetic recommendation assistant by: (1) splitting the layout into chat + recommendations panels, (2) emitting a `context` SSE event from the backend with retrieved product/guide metadata, (3) rendering recommendation cards with RAG evidence, and (4) adding a mobile bottom sheet for product results.

## Scope
- In:
  - Desktop split-panel layout (chat left, recommendations right)
  - Backend `context` SSE event carrying structured product/guide data
  - Frontend SSE client update to handle `context` events
  - `ProductRecommendationCard` component with name, brand, price, skin type, reason, source
  - `RecommendationPanel` component with empty/loading/results states
  - `MobileRecommendationsSheet` bottom sheet
  - `QuickQuestionChips` extraction into its own component
  - `SourcesStrip` for guide evidence display
  - Loading skeletons and empty state in recommendation panel
  - Visual direction: soft panels, green palette, high contrast, minimal decoration

- Out:
  - Auth, multi-user sessions, or deployment config
  - New product ingestion or CSV schema changes
  - LLM prompt changes (system prompt stays as-is)
  - PDF guide ingestion improvements
  - Marketing/landing page elements
  - E2E test automation framework
  - Internationalization

## Phases

### Phase 1: Layout Shell & Component Extraction
**Goal**: Convert the single-column chat into a responsive two-panel desktop layout and extract chips into a reusable component.

#### Task 1.1: Extract QuickQuestionChips component
- Location: `frontend/src/lib/components/QuickQuestionChips.svelte`
- Description: Move the `quickQuestions` array and chip rendering from `+page.svelte` into a standalone component that accepts `questions`, `disabled`, and `onSelect` props.
- Estimated Tokens: 800
- Dependencies: None
- Steps:
  - Create `QuickQuestionChips.svelte` with props: `questions: string[]`, `disabled: boolean`, `onSelect: (q: string) => void`
  - Move the `.quick-actions` markup and styles from `+page.svelte`
  - Import and use in `+page.svelte`, passing `quickQuestions`, `isLoading`, and `handleSend`
- Acceptance Criteria:
  - Chips render and function identically to current behavior
  - No visual regression at mobile and desktop widths
  - `+page.svelte` no longer contains inline chip markup

#### Task 1.2: Create RecommendationPanel shell
- Location: `frontend/src/lib/components/RecommendationPanel.svelte`
- Description: Create the right-side panel component with three states: empty (initial), loading (skeleton), and results (placeholder slots for cards).
- Estimated Tokens: 1200
- Dependencies: None
- Steps:
  - Create component accepting props: `products: array`, `guides: array`, `isLoading: boolean`
  - Render empty state with message "Las recomendaciones apareceran aqui al consultar" when `products` is empty and not loading
  - Render 3 skeleton card placeholders when `isLoading` is true
  - Render a slot/list area for product cards when `products.length > 0`
  - Style with soft white panel, thin border (`#d8ddd7`), 16px padding, subtle box-shadow
- Acceptance Criteria:
  - All three states render correctly
  - Panel fills available flex space

#### Task 1.3: Convert +page.svelte to split-panel layout
- Location: `frontend/src/routes/+page.svelte`
- Description: Replace the single-column `<main>` with a two-column layout: chat panel (fixed 460px on desktop) and recommendation panel (flexible). Mobile stacks vertically with only chat visible.
- Estimated Tokens: 1500
- Dependencies: Task 1.1, Task 1.2
- Steps:
  - Add state variables: `recommendations = $state([])`, `guides = $state([])`
  - Wrap header + chat section + footer into a `.chat-panel` div with `width: 460px; flex-shrink: 0`
  - Place `<RecommendationPanel>` as sibling in a new `.app-layout` flex container
  - Add `@media (max-width: 900px)` rule to stack layout and hide recommendation panel
  - Keep existing header, scroll, and footer styles scoped to `.chat-panel`
  - Pass `recommendations`, `guides`, `isLoading` to `RecommendationPanel`
- Acceptance Criteria:
  - Desktop (>900px): chat on left (460px), recommendations on right (flexible)
  - Mobile (<=900px): chat fills screen, panel hidden
  - Chat remains fully functional with streaming
  - Quick chips and input remain in chat panel footer

### Phase 2: RAG Context Events
**Goal**: Emit retrieved product/guide data as a `context` SSE event before streaming LLM tokens, and consume it in the frontend.

#### Task 2.1: Refactor pipeline to return context separately
- Location: `backend/rag/pipeline.py`
- Description: Change `generate_response` to yield a structured context payload before yielding text tokens, so the route can emit it as a separate SSE event.
- Estimated Tokens: 1000
- Dependencies: None
- Steps:
  - Create a new function `retrieve_context(message: str) -> dict` that calls `retrieve_all(message)` and returns `{"products": [...], "guides": [...]}` with structured fields per item (name, brand, price, category, skin_types, benefits, reason, source, score for products; filename, page, snippet for guides)
  - Modify `generate_response` signature to accept a pre-built `retrieved_items` parameter instead of calling `retrieve_all` internally, or split retrieval out so the caller (routes.py) can access it
  - Keep `build_context(retrieved_items)` call unchanged for prompt construction
- Acceptance Criteria:
  - `retrieve_context("piel seca")` returns a dict with products array containing `name`, `brand`, `price`, `category`, `skin_types`, `benefits`, `score`, `source` fields
  - Guides array contains `filename`, `page`, `snippet` fields
  - Existing streaming still works unchanged

#### Task 2.2: Emit context SSE event in routes.py
- Location: `backend/api/routes.py`
- Description: Before streaming tokens, emit a `context` event with the structured retrieval results.
- Estimated Tokens: 600
- Dependencies: Task 2.1
- Steps:
  - Import `retrieve_context` (or equivalent) from pipeline
  - In `event_generator()`, call retrieval first, yield `{"event": "context", "data": json.dumps(context_payload)}`
  - Then proceed with existing token streaming
  - Pass `retrieved_items` to `generate_response` so retrieval isn't duplicated
- Acceptance Criteria:
  - SSE stream order is: `context` → `token`* → `done`
  - `curl -X POST http://localhost:8000/chat -H 'Content-Type: application/json' -d '{"message":"piel seca","session_id":"test"}' ` shows `event: context` line with JSON products
  - Token streaming still works

#### Task 2.3: Update frontend SSE client to handle context event
- Location: `frontend/src/lib/api.js`
- Description: Extend `streamChat` to accept an `onContext` callback and invoke it when a `context` event arrives.
- Estimated Tokens: 600
- Dependencies: Task 2.2
- Steps:
  - Change `streamChat` signature: `streamChat(message, sessionId, onToken, onContext)`
  - In the parse loop, detect `data.products` or `data.guides` keys (context event) and call `onContext(data)`
  - Update `+page.svelte` to pass an `onContext` handler that sets `recommendations` and `guides` state
- Acceptance Criteria:
  - On each chat query, `recommendations` state updates with product objects before text starts appearing
  - `RecommendationPanel` transitions from loading to showing products
  - Existing token streaming unaffected

### Phase 3: Recommendation Cards
**Goal**: Render product recommendations as scannable cards with RAG evidence (reason, price, skin type, source).

#### Task 3.1: Create ProductRecommendationCard component
- Location: `frontend/src/lib/components/ProductRecommendationCard.svelte`
- Description: A card displaying a single recommended product with all relevant fields.
- Estimated Tokens: 1200
- Dependencies: Task 2.3
- Steps:
  - Props: `product: { name, brand, price, category, skin_types, benefits, reason, source, score }`
  - Layout: name (bold, large), brand (muted), price (`$` formatted), skin type chips, benefits chips, reason text, source badge
  - Style: white background, thin border, 12px border-radius, 16px padding, subtle hover elevation
  - Score indicator: simple relevance bar or percentage badge (e.g. "92% match")
  - Animate entrance with `transition:fly` from svelte/transition
- Acceptance Criteria:
  - Card renders all fields legibly
  - Chips for skin types are compact pill-shaped elements
  - Price is visually prominent
  - Score/relevance visible

#### Task 3.2: Create SourcesStrip component
- Location: `frontend/src/lib/components/SourcesStrip.svelte`
- Description: A compact strip showing which guides were consulted during retrieval.
- Estimated Tokens: 600
- Dependencies: Task 2.3
- Steps:
  - Props: `guides: { filename, page, snippet }[]`
  - Render horizontal list of small badges: "📄 guia_cuidado_facial.pdf p.3"
  - Expandable snippet on click/hover (optional first pass: tooltip)
  - Style: muted colors, small font, row layout with overflow scroll
- Acceptance Criteria:
  - Guides appear below product cards
  - Each guide shows filename and page
  - Visually unobtrusive but present

#### Task 3.3: Integrate cards into RecommendationPanel
- Location: `frontend/src/lib/components/RecommendationPanel.svelte`
- Description: Replace placeholder slots with actual `ProductRecommendationCard` and `SourcesStrip` instances.
- Estimated Tokens: 600
- Dependencies: Task 3.1, Task 3.2
- Steps:
  - Import `ProductRecommendationCard` and `SourcesStrip`
  - In results state, iterate `products` and render a card for each
  - Below cards, render `SourcesStrip` with `guides` prop
  - Add subtle stagger animation (50ms delay per card)
  - First card gets a subtle "Top recomendacion" badge if score > 0.7
- Acceptance Criteria:
  - Querying "piel seca" shows 2-3 product cards with correct data
  - Guide sources strip appears below cards
  - Loading state transitions smoothly to cards appearing

### Phase 4: Mobile Bottom Sheet
**Goal**: On mobile, show product recommendations in a swipeable bottom sheet triggered from the chat.

#### Task 4.1: Create MobileRecommendationsSheet component
- Location: `frontend/src/lib/components/MobileRecommendationsSheet.svelte`
- Description: A bottom sheet overlay that slides up from the bottom, displaying product cards and guides on mobile.
- Estimated Tokens: 1500
- Dependencies: Task 3.1, Task 3.2
- Steps:
  - Props: `open: boolean`, `products: array`, `guides: array`, `onClose: () => void`
  - Render a backdrop + sheet container with `max-height: 80vh`, `border-radius: 16px 16px 0 0`
  - Include drag handle at top, scroll container for cards, close button
  - Animate with CSS transform `translateY` (open: 0, closed: 100%)
  - Render `ProductRecommendationCard` and `SourcesStrip` inside
  - Trap focus within when open for accessibility
- Acceptance Criteria:
  - Sheet slides up smoothly on mobile
  - Products and guides render inside
  - Tapping backdrop or close button dismisses
  - Does not interfere with chat input when closed

#### Task 4.2: Add "Ver recomendaciones" trigger in mobile chat
- Location: `frontend/src/routes/+page.svelte`
- Description: When recommendations exist and viewport is mobile, show a floating chip/button that opens the bottom sheet.
- Estimated Tokens: 600
- Dependencies: Task 4.1
- Steps:
  - Add `showSheet = $state(false)` state
  - Conditionally render a floating button "Ver X productos" above the footer when `recommendations.length > 0` and screen width <= 900px
  - On click, set `showSheet = true`
  - Render `MobileRecommendationsSheet` with `open={showSheet}`
  - Use `matchMedia` or CSS to only show trigger on mobile
- Acceptance Criteria:
  - On mobile after a query, floating chip appears with product count
  - Tapping opens bottom sheet with correct products
  - Sheet closes and chat remains functional
  - No overlap with input area

### Phase 5: Polish & Empty States
**Goal**: Add loading skeletons, useful empty states, and validate with realistic queries.

#### Task 5.1: Loading states and skeletons
- Location: `frontend/src/lib/components/RecommendationPanel.svelte`
- Description: Add animated skeleton cards during the loading state (between user query and context event arrival).
- Estimated Tokens: 400
- Dependencies: Task 1.2
- Steps:
  - Create CSS-only skeleton animation (pulsing gray rectangles matching card shape)
  - Show 3 skeleton cards when `isLoading && products.length === 0`
  - Add a subtle "Buscando en catalogo..." label above skeletons
- Acceptance Criteria:
  - Skeletons appear immediately on query submit
  - They disappear when context event arrives
  - Animation is smooth and not distracting

#### Task 5.2: Useful empty states
- Location: `frontend/src/lib/components/RecommendationPanel.svelte`
- Description: Show contextual empty messages depending on conversation state.
- Estimated Tokens: 300
- Dependencies: Task 1.2
- Steps:
  - Initial empty state: "Consulta al asistente y los productos relevantes apareceran aqui"
  - No-results state (context arrived but products is empty): "No se encontraron productos que coincidan. Intenta reformular la consulta."
  - Include subtle icon or illustration (CSS-only, no external assets)
- Acceptance Criteria:
  - Each state renders with appropriate messaging
  - Transitions are smooth between states

#### Task 5.3: Validation with realistic queries
- Location: All frontend/backend
- Description: Manually test 5 realistic seller scenarios end-to-end.
- Estimated Tokens: 200
- Dependencies: All prior tasks
- Steps:
  - Test: "Rutina para piel seca con presupuesto bajo" → expect CeraVe, Bioderma products
  - Test: "Producto para piel grasa con brillo" → expect Serum Niacinamida, Effaclar
  - Test: "Clienta de 40 anos busca anti-edad" → expect Revitalift
  - Test: "Protector solar para piel sensible" → expect Anthelios
  - Test: follow-up "algo mas economico" → verify session context maintained
  - Verify context event fires before tokens
  - Verify mobile bottom sheet triggers
- Acceptance Criteria:
  - All 5 queries produce relevant recommendations in the panel
  - Context SSE event contains correct product metadata
  - Cards display price, skin types, reason
  - Mobile sheet opens with products
  - No JS console errors

## Testing Strategy
- **Backend unit test**: Add `backend/tests/test_context_event.py` — call `retrieve_context("piel seca")` and assert returned dict has `products` list with expected keys (`name`, `brand`, `price`, `category`, `skin_types`, `source`, `score`)
- **Backend integration test**: POST to `/chat` with `session_id`, parse SSE stream, assert `context` event precedes first `token` event
- **Frontend manual test**: Run dev server, submit query, verify Network tab shows `event: context` in SSE stream, verify recommendation panel populates
- **Responsive test**: Use browser DevTools responsive mode at 375px, 768px, 1280px widths; verify layout switches at 900px breakpoint
- **Edge case test**: Query with no matching products (e.g. "perfume para hombre") should show empty state, not crash

## Risks
- **SSE event ordering**: If `retrieve_all` is slow, the `context` event delays the entire response. Mitigation: retrieval is already synchronous and fast (local ChromaDB with in-memory embeddings); if needed, emit context asynchronously but currently unnecessary given local setup.
- **Product metadata mismatch**: CSV column names (`nombre`, `tipo_piel`) differ from the JSON schema in the design doc (`name`, `skin_types`). Mitigation: Task 2.1 explicitly maps metadata keys from `product_name` → `name`, `skin_types` → `skin_types` etc. during `retrieve_context` construction.
- **Mobile bottom sheet z-index conflicts**: The sheet overlay may fight with the sticky chat footer. Mitigation: Use a fixed-position overlay with z-index > 1000 and portal-like rendering.
- **Self-critique: Reason field may be empty or generic.** The `reason` field in the context event depends on the retriever, which doesn't generate explanations — it only returns embeddings similarity scores. The design assumes a `reason` string exists but the retriever cannot produce it without LLM inference. Mitigation: For Phase 2, populate `reason` with a template string like "Coincide con: {skin_types}" derived from metadata overlap with the query. A richer LLM-generated reason would require a separate call and is out of scope.
- **Self-critique: No automated frontend tests.** This plan relies on manual verification for all UI behavior. A regression in card rendering or layout breakpoints won't be caught automatically. Mitigation: Keep component interfaces small and props-driven so visual testing is straightforward; add Playwright smoke test as a future improvement.

## Rollback Plan
- Each phase is independently deployable. If Phase 2 (context event) introduces issues, revert the `routes.py` and `pipeline.py` changes — the frontend gracefully handles missing `onContext` (no cards render, chat still works).
- If the layout refactor (Phase 1) causes mobile regressions, revert `+page.svelte` to the single-column layout — all new components are additive and unused without the layout wrapper.
- Git strategy: one commit per task, allowing `git revert` of any individual task without affecting others.

## Edge Cases
- **Empty ChromaDB**: If no products are ingested, `retrieve_context` returns `{"products": [], "guides": []}`. The panel shows the no-results empty state. No crash.
- **Very long product names**: Card uses `overflow-wrap: anywhere` and truncates with ellipsis after 2 lines.
- **Rapid successive queries**: New context event replaces previous recommendations. No accumulation — `recommendations` state is overwritten, not appended.
- **Network interruption mid-stream**: Existing error handling in `api.js` catches fetch failures. Recommendation panel stays in last known state (not cleared on error).
- **Backend without API key (fallback mode)**: Context event is still emitted (retrieval happens regardless of LLM availability). Cards populate even when the text response uses the local fallback.
- **Session with no prior history**: First message works — `sessions.get()` returns empty list, retrieval proceeds normally.

## Open Questions
- Should the `reason` field eventually be generated by the LLM (costs an extra inference call or structured output request), or is metadata-derived matching sufficient for the demo?
- Should recommendation history persist across messages (accordion of past recommendations) or always show only the latest query's results?
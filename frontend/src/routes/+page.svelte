<script>
  import { onMount } from 'svelte';
  import ChatInput from '$lib/components/ChatInput.svelte';
  import ChatMessage from '$lib/components/ChatMessage.svelte';
  import MobileRecommendationsSheet from '$lib/components/MobileRecommendationsSheet.svelte';
  import QuickQuestionChips from '$lib/components/QuickQuestionChips.svelte';
  import RecommendationPanel from '$lib/components/RecommendationPanel.svelte';
  import { streamChat } from '$lib/api.js';

  const quickQuestions = [
    'Rutina para piel seca con presupuesto bajo',
    'Clienta de 40 años busca anti-edad',
    'Producto para piel grasa con brillo',
    'Protector solar para piel sensible',
    'Algo más económico para hidratar',
    'Cómo usar ácido hialurónico'
  ];

  let messages = $state([
    {
      role: 'assistant',
      content:
        'Hola. Describe el perfil del cliente y te ayudo a recomendar productos del catalogo cargado.'
    }
  ]);
  let isLoading = $state(false);
  let contextLoading = $state(false);
  let recommendations = $state([]);
  let guides = $state([]);
  let showRecommendations = $state(false);
  let sessionId = $state('');
  let scrollContainer;

  onMount(() => {
    sessionId = crypto.randomUUID();
  });

  $effect(() => {
    messages;
    scrollContainer?.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
  });

  async function handleSend(message) {
    messages = [
      ...messages,
      { role: 'user', content: message },
      { role: 'assistant', content: 'Buscando productos relevantes en el catalogo...' }
    ];
    isLoading = true;
    contextLoading = true;
    recommendations = [];
    guides = [];
    showRecommendations = false;
    const assistantIndex = messages.length - 1;
    let hasToken = false;

    try {
      await streamChat(message, sessionId, {
        onContext: (context) => {
          recommendations = context.products ?? [];
          guides = context.guides ?? [];
          if (!hasToken) {
            const productCount = recommendations.length;
            messages[assistantIndex].content = productCount
              ? `Encontre ${productCount} producto${productCount === 1 ? '' : 's'} relevantes. Generando respuesta...`
              : 'Contexto recibido. Generando respuesta...';
            messages = messages;
          }
          contextLoading = false;
        },
        onToken: (token) => {
          if (!hasToken) {
            messages[assistantIndex].content = '';
            hasToken = true;
          }
          messages[assistantIndex].content += token;
          messages = messages;
        }
      });
    } catch (error) {
      messages[assistantIndex].content =
        error instanceof Error ? `Error: ${error.message}` : 'Error inesperado al consultar el RAG.';
      messages = messages;
    } finally {
      isLoading = false;
      contextLoading = false;
    }
  }
</script>

<svelte:head>
  <title>RAG Cosmética</title>
</svelte:head>

<main>
  <div class="app-layout">
    <div class="chat-panel">
      <header>
        <div>
          <p>Asistente RAG</p>
          <h1>Recomendador de cosmética</h1>
        </div>
        <span class:active={!isLoading}>{isLoading ? 'Consultando' : 'Listo'}</span>
      </header>

      <section bind:this={scrollContainer} aria-live="polite">
        {#each messages as message}
          <ChatMessage role={message.role} content={message.content || '...'} />
        {/each}
      </section>

      {#if recommendations.length}
        <button class="mobile-recs" type="button" onclick={() => (showRecommendations = true)}>
          Ver {recommendations.length} producto{recommendations.length === 1 ? '' : 's'} recomendados
        </button>
      {/if}

      <footer>
        <QuickQuestionChips questions={quickQuestions} disabled={isLoading} onSelect={handleSend} />
        <ChatInput disabled={isLoading} onSend={handleSend} />
      </footer>
    </div>

    <div class="recommendations-shell">
      <RecommendationPanel products={recommendations} {guides} isLoading={contextLoading} />
    </div>
  </div>

  <MobileRecommendationsSheet
    open={showRecommendations}
    products={recommendations}
    {guides}
    onClose={() => (showRecommendations = false)}
  />
</main>

<style>
  :global(body) {
    margin: 0;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #f4f6f1;
    color: #20231f;
  }

  main {
    min-height: 100vh;
    padding: 18px;
    box-sizing: border-box;
  }

  .app-layout {
    display: flex;
    gap: 18px;
    width: min(1360px, 100%);
    height: calc(100vh - 36px);
    min-height: 0;
    margin: 0 auto;
  }

  .chat-panel {
    display: grid;
    grid-template-rows: auto 1fr auto auto;
    flex: 0 0 460px;
    min-width: 0;
    min-height: 0;
    border: 1px solid #d8ddd7;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.62);
    box-shadow: 0 18px 46px rgba(20, 28, 22, 0.07);
    overflow: hidden;
  }

  .recommendations-shell {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    padding: 20px 22px 16px;
    border-bottom: 1px solid #dfe4dc;
  }

  p {
    margin: 0 0 4px;
    color: #5d695c;
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: clamp(1.7rem, 2rem, 2.2rem);
    letter-spacing: 0;
  }

  span {
    flex: 0 0 auto;
    border: 1px solid #c9d0c8;
    border-radius: 999px;
    padding: 8px 12px;
    color: #5d695c;
    background: #ffffff;
    font-size: 0.9rem;
    font-weight: 700;
  }

  span.active {
    color: #17453a;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
    padding: 18px;
    overflow-y: auto;
  }

  footer {
    display: grid;
    gap: 12px;
    padding: 14px 18px 18px;
    border-top: 1px solid #dfe4dc;
    background: rgba(244, 246, 241, 0.86);
  }

  .mobile-recs {
    display: none;
  }

  @media (max-width: 900px) {
    main {
      padding: 0;
    }

    .app-layout {
      display: block;
      width: 100%;
      height: 100vh;
    }

    .chat-panel {
      width: 100%;
      height: 100vh;
      border: 0;
      border-radius: 0;
    }

    .recommendations-shell {
      display: none;
    }

    .mobile-recs {
      display: block;
      justify-self: start;
      margin: 0 18px 10px;
      border: 1px solid #17453a;
      border-radius: 999px;
      padding: 10px 13px;
      background: #17453a;
      color: #ffffff;
      font: inherit;
      font-size: 0.9rem;
      font-weight: 800;
      cursor: pointer;
    }
  }

  @media (max-width: 640px) {
    header {
      align-items: flex-start;
      flex-direction: column;
    }

    h1 {
      font-size: 1.55rem;
    }
  }
</style>

<script>
  import ProductRecommendationCard from './ProductRecommendationCard.svelte';
  import SourcesStrip from './SourcesStrip.svelte';

  let { products = [], guides = [], isLoading = false } = $props();
</script>

<aside aria-label="Recomendaciones RAG">
  <header>
    <div>
      <p>Contexto RAG</p>
      <h2>Productos recomendados</h2>
    </div>
    {#if products.length}
      <span>{products.length}</span>
    {/if}
  </header>

  {#if isLoading}
    <div class="loading">
      <p>Buscando en catálogo...</p>
      {#each Array(3) as _}
        <div class="skeleton">
          <i></i>
          <b></b>
          <small></small>
        </div>
      {/each}
    </div>
  {:else if products.length}
    <div class="results">
      {#each products as product, index}
        <ProductRecommendationCard {product} {index} highlighted={index === 0} />
      {/each}
      <SourcesStrip {guides} />
    </div>
  {:else}
    <div class="empty">
      <div class="mark">RAG</div>
      <h3>Consulta al asistente</h3>
      <p>Los productos relevantes aparecerán aquí con precio, tipo de piel y evidencia del catálogo.</p>
    </div>
  {/if}
</aside>

<style>
  aside {
    display: grid;
    grid-template-rows: auto 1fr;
    min-width: 0;
    min-height: 0;
    border: 1px solid #d8ddd7;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.74);
    box-shadow: 0 18px 46px rgba(20, 28, 22, 0.07);
    overflow: hidden;
  }

  header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    padding: 20px 22px;
    border-bottom: 1px solid #dfe4dc;
  }

  header p {
    margin: 0 0 4px;
    color: #657064;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  h2,
  h3 {
    margin: 0;
    color: #18221d;
    letter-spacing: 0;
  }

  h2 {
    font-size: 1.2rem;
  }

  header span {
    border-radius: 999px;
    min-width: 34px;
    padding: 7px 10px;
    color: #ffffff;
    background: #17453a;
    text-align: center;
    font-weight: 800;
  }

  .results,
  .loading,
  .empty {
    min-height: 0;
    overflow-y: auto;
    padding: 18px;
  }

  .results,
  .loading {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .loading p,
  .empty p {
    margin: 0;
    color: #657064;
    line-height: 1.5;
  }

  .skeleton {
    display: grid;
    gap: 12px;
    border: 1px solid #d8ddd7;
    border-radius: 12px;
    padding: 16px;
    background: #ffffff;
  }

  .skeleton i,
  .skeleton b,
  .skeleton small {
    display: block;
    border-radius: 999px;
    background: linear-gradient(90deg, #e7ece5, #f7f9f4, #e7ece5);
    background-size: 220% 100%;
    animation: shimmer 1.4s infinite;
  }

  .skeleton i {
    width: 64%;
    height: 18px;
  }

  .skeleton b {
    width: 36%;
    height: 24px;
  }

  .skeleton small {
    width: 82%;
    height: 14px;
  }

  .empty {
    display: grid;
    place-content: center;
    gap: 12px;
    text-align: center;
  }

  .mark {
    justify-self: center;
    border-radius: 999px;
    padding: 10px 12px;
    color: #ffffff;
    background: #17453a;
    font-size: 0.78rem;
    font-weight: 900;
  }

  @keyframes shimmer {
    to {
      background-position: -220% 0;
    }
  }
</style>

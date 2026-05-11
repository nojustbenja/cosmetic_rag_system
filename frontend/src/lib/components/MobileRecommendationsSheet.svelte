<script>
  import ProductRecommendationCard from './ProductRecommendationCard.svelte';
  import SourcesStrip from './SourcesStrip.svelte';

  let { open = false, products = [], guides = [], onClose } = $props();
</script>

{#if open}
  <div class="overlay" role="presentation" onclick={onClose}></div>
  <section class="sheet" aria-label="Productos recomendados">
    <div class="handle"></div>
    <header>
      <div>
        <p>Recomendaciones</p>
        <h2>{products.length} producto{products.length === 1 ? '' : 's'}</h2>
      </div>
      <button type="button" aria-label="Cerrar recomendaciones" onclick={onClose}>×</button>
    </header>
    <div class="content">
      {#each products as product, index}
        <ProductRecommendationCard {product} {index} highlighted={index === 0} />
      {/each}
      <SourcesStrip {guides} />
    </div>
  </section>
{/if}

<style>
  .overlay,
  .sheet {
    display: none;
  }

  @media (max-width: 900px) {
    .overlay {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(24, 34, 29, 0.24);
      backdrop-filter: blur(4px);
    }

    .sheet {
      display: grid;
      grid-template-rows: auto auto 1fr;
      position: fixed;
      inset: auto 0 0;
      z-index: 1001;
      max-height: 82dvh;
      border-radius: 18px 18px 0 0;
      border: 1px solid #d8ddd7;
      background: #f4f6f1;
      box-shadow: 0 -18px 48px rgba(20, 28, 22, 0.18);
      animation: sheet-in 0.26s ease-out both;
      overflow: hidden;
    }

    .handle {
      justify-self: center;
      width: 42px;
      height: 5px;
      margin-top: 10px;
      border-radius: 999px;
      background: #c4ccc2;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 16px 18px 10px;
    }

    p,
    h2 {
      margin: 0;
    }

    p {
      color: #657064;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    h2 {
      color: #18221d;
      font-size: 1.25rem;
    }

    button {
      width: 40px;
      height: 40px;
      border: 1px solid #d8ddd7;
      border-radius: 999px;
      background: #ffffff;
      color: #18221d;
      font: inherit;
      font-size: 1.4rem;
      cursor: pointer;
    }

    .content {
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-height: 0;
      padding: 10px 18px 24px;
      overflow-y: auto;
    }

    @keyframes sheet-in {
      from {
        transform: translateY(100%);
      }

      to {
        transform: translateY(0);
      }
    }
  }
</style>

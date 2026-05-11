<script>
  let { product, highlighted = false, index = 0 } = $props();

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === '') return 'N/D';
    return `CLP $${Number(price).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;
  };

  const scorePercent = (score) => {
    const value = Number(score);
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(100, Math.round(value * 100)));
  };
</script>

<article class:highlighted style={`animation-delay: ${index * 55}ms`}>
  <div class="topline">
    <div>
      <h3>{product.name}</h3>
      <p class="brand">{product.brand || 'Sin marca'}</p>
    </div>
    {#if highlighted}
      <span class="badge strong">Top</span>
    {:else if scorePercent(product.score) !== null}
      <span class="badge">{scorePercent(product.score)}%</span>
    {/if}
  </div>

  <div class="price">{formatPrice(product.price)}</div>

  {#if product.skin_types?.length}
    <div class="pills" aria-label="Tipos de piel">
      {#each product.skin_types as skinType}
        <span>{skinType}</span>
      {/each}
    </div>
  {/if}

  {#if product.benefits?.length}
    <div class="benefits" aria-label="Beneficios">
      {#each product.benefits.slice(0, 3) as benefit}
        <span>{benefit}</span>
      {/each}
    </div>
  {/if}

  <p class="reason">{product.reason}</p>

  <div class="meta">
    <span>{product.category?.replaceAll('_', ' ') || 'catalogo'}</span>
    <span>{product.source || 'catalog'}</span>
  </div>
</article>

<style>
  article {
    display: grid;
    gap: 12px;
    border: 1px solid #d8ddd7;
    border-radius: 12px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 10px 28px rgba(20, 28, 22, 0.06);
    animation: float-up 0.34s ease-out both;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      border-color 0.2s ease;
  }

  article:hover {
    transform: translateY(-2px);
    border-color: #b5c2ba;
    box-shadow: 0 16px 34px rgba(20, 28, 22, 0.09);
  }

  article.highlighted {
    border-color: #2f6f5e;
    box-shadow: 0 18px 42px rgba(23, 69, 58, 0.12);
  }

  .topline,
  .meta {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }

  h3 {
    margin: 0;
    color: #18221d;
    font-size: 1.02rem;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .brand {
    margin: 4px 0 0;
    color: #657064;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .price {
    color: #17453a;
    font-size: 1.28rem;
    font-weight: 800;
    letter-spacing: 0;
  }

  .badge,
  .meta span {
    flex: 0 0 auto;
    border: 1px solid #d8ddd7;
    border-radius: 999px;
    padding: 5px 8px;
    color: #5d695c;
    background: #f7f9f4;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .badge.strong {
    border-color: #17453a;
    color: #ffffff;
    background: #17453a;
  }

  .pills,
  .benefits {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .pills span,
  .benefits span {
    border-radius: 999px;
    padding: 6px 9px;
    color: #26312c;
    background: #edf3ec;
    font-size: 0.78rem;
    line-height: 1;
  }

  .benefits span {
    background: #f8ecec;
  }

  .reason {
    margin: 0;
    color: #3e4a42;
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .meta {
    align-items: center;
  }

  .meta span {
    text-transform: none;
    font-size: 0.72rem;
  }

  @keyframes float-up {
    from {
      opacity: 0;
      transform: translateY(10px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

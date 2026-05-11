<script>
  let { guides = [] } = $props();
</script>

{#if guides.length}
  <div class="sources" aria-label="Fuentes usadas">
    <p>Fuentes</p>
    <div>
      {#each guides as guide}
        <span title={guide.snippet}>
          {guide.filename}{guide.page ? ` p.${guide.page}` : ''}
        </span>
      {/each}
    </div>
  </div>
{/if}

<style>
  .sources {
    display: grid;
    gap: 8px;
    margin-top: 4px;
  }

  p {
    margin: 0;
    color: #657064;
    font-size: 0.76rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  div {
    display: flex;
    gap: 8px;
    overflow-x: auto;
  }

  span {
    flex: 0 0 auto;
    border: 1px solid #d8ddd7;
    border-radius: 999px;
    padding: 7px 10px;
    color: #4e5a50;
    background: rgba(255, 255, 255, 0.58);
    font-size: 0.78rem;
  }
</style>

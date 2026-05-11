<script>
  let { questions = [], disabled = false, onSelect } = $props();
</script>

<div class="quick-actions" aria-label="Preguntas rápidas">
  {#each questions as question}
    <button type="button" disabled={disabled} onclick={() => onSelect(question)} title={question}>
      {question}
    </button>
  {/each}
</div>

<style>
  .quick-actions {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: thin;
  }

  button {
    flex: 0 0 auto;
    max-width: min(310px, 78vw);
    border: 1px solid #c9d0c8;
    border-radius: 999px;
    padding: 9px 13px;
    background: #ffffff;
    color: #26312c;
    font: inherit;
    font-size: 0.92rem;
    line-height: 1.25;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }

  button:hover:not(:disabled),
  button:focus-visible {
    border-color: #2f6f5e;
    color: #17453a;
    outline: none;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
</style>

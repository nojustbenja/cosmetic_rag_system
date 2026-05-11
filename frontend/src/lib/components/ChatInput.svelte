<script>
  let { disabled = false, onSend } = $props();
  let message = $state('');

  function submit() {
    const value = message.trim();
    if (!value || disabled) return;
    onSend(value);
    message = '';
  }
</script>

<form onsubmit={(event) => { event.preventDefault(); submit(); }}>
  <textarea
    bind:value={message}
    disabled={disabled}
    rows="2"
    placeholder="Describe al cliente, necesidad, tipo de piel o presupuesto..."
    onkeydown={(event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    }}
  ></textarea>
  <button type="submit" disabled={disabled || !message.trim()} aria-label="Enviar consulta">
    Enviar
  </button>
</form>

<style>
  form {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    width: 100%;
    align-items: end;
  }

  textarea {
    width: 100%;
    min-height: 56px;
    max-height: 148px;
    resize: vertical;
    border: 1px solid #c9d0c8;
    border-radius: 8px;
    padding: 14px 15px;
    font: inherit;
    line-height: 1.4;
    color: #20231f;
    background: #ffffff;
  }

  textarea:focus {
    outline: 2px solid #2f6f5e;
    outline-offset: 2px;
  }

  button {
    height: 56px;
    min-width: 98px;
    border: 0;
    border-radius: 8px;
    background: #17453a;
    color: white;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  button:disabled,
  textarea:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }

  @media (max-width: 640px) {
    form {
      grid-template-columns: 1fr;
    }

    button {
      width: 100%;
    }
  }
</style>

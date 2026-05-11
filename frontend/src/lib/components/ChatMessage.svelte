<script>
  let { role, content } = $props();

  const renderMarkdown = (text) =>
    text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
</script>

<article class:user={role === 'user'} class:assistant={role === 'assistant'}>
  <div class="bubble">
    {@html renderMarkdown(content)}
  </div>
</article>

<style>
  article {
    display: flex;
    width: 100%;
  }

  article.user {
    justify-content: flex-end;
  }

  article.assistant {
    justify-content: flex-start;
  }

  .bubble {
    max-width: min(760px, 86%);
    border: 1px solid #d8ddd7;
    border-radius: 8px;
    padding: 14px 16px;
    line-height: 1.55;
    overflow-wrap: anywhere;
    white-space: normal;
    background: #ffffff;
    color: #20231f;
    box-shadow: 0 8px 26px rgba(20, 28, 22, 0.06);
  }

  .user .bubble {
    background: #17453a;
    border-color: #17453a;
    color: #ffffff;
  }
</style>

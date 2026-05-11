import { a0 as attr, e as escape_html, a1 as attr_class, a2 as attr_style, a3 as ensure_array_like, a4 as head } from "../../chunks/renderer.js";
function html(value) {
  var html2 = String(value ?? "");
  var open = "<!---->";
  return open + html2 + "<!---->";
}
function ChatInput($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { disabled = false } = $$props;
    let message = "";
    $$renderer2.push(`<form class="svelte-5wsbgm"><textarea${attr("disabled", disabled, true)} rows="2" placeholder="Describe al cliente, necesidad, tipo de piel o presupuesto..." class="svelte-5wsbgm">`);
    const $$body = escape_html(message);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea> <button type="submit"${attr("disabled", disabled || !message.trim(), true)} aria-label="Enviar consulta" class="svelte-5wsbgm">Enviar</button></form>`);
  });
}
function ChatMessage($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { role, content } = $$props;
    const renderMarkdown = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br />");
    $$renderer2.push(`<article${attr_class("svelte-1ebqwt", void 0, { "user": role === "user", "assistant": role === "assistant" })}><div class="bubble svelte-1ebqwt">${html(renderMarkdown(content))}</div></article>`);
  });
}
function ProductRecommendationCard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { product, highlighted = false, index = 0 } = $$props;
    const formatPrice = (price) => {
      if (price === null || price === void 0 || price === "") return "N/D";
      return `CLP $${Number(price).toLocaleString("es-CL", { maximumFractionDigits: 0 })}`;
    };
    const scorePercent = (score) => {
      const value = Number(score);
      if (!Number.isFinite(value)) return null;
      return Math.max(0, Math.min(100, Math.round(value * 100)));
    };
    $$renderer2.push(`<article${attr_style(`animation-delay: ${index * 55}ms`)}${attr_class("svelte-xvgsu2", void 0, { "highlighted": highlighted })}><div class="topline svelte-xvgsu2"><div><h3 class="svelte-xvgsu2">${escape_html(product.name)}</h3> <p class="brand svelte-xvgsu2">${escape_html(product.brand || "Sin marca")}</p></div> `);
    if (highlighted) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="badge strong svelte-xvgsu2">Top</span>`);
    } else if (scorePercent(product.score) !== null) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<span class="badge svelte-xvgsu2">${escape_html(scorePercent(product.score))}%</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="price svelte-xvgsu2">${escape_html(formatPrice(product.price))}</div> `);
    if (product.skin_types?.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="pills svelte-xvgsu2" aria-label="Tipos de piel"><!--[-->`);
      const each_array = ensure_array_like(product.skin_types);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let skinType = each_array[$$index];
        $$renderer2.push(`<span class="svelte-xvgsu2">${escape_html(skinType)}</span>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (product.benefits?.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="benefits svelte-xvgsu2" aria-label="Beneficios"><!--[-->`);
      const each_array_1 = ensure_array_like(product.benefits.slice(0, 3));
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let benefit = each_array_1[$$index_1];
        $$renderer2.push(`<span class="svelte-xvgsu2">${escape_html(benefit)}</span>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <p class="reason svelte-xvgsu2">${escape_html(product.reason)}</p> <div class="meta svelte-xvgsu2"><span class="svelte-xvgsu2">${escape_html(product.category?.replaceAll("_", " ") || "catalogo")}</span> <span class="svelte-xvgsu2">${escape_html(product.source || "catalog")}</span></div></article>`);
  });
}
function SourcesStrip($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { guides = [] } = $$props;
    if (guides.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="sources svelte-14vd520" aria-label="Fuentes usadas"><p class="svelte-14vd520">Fuentes</p> <div class="svelte-14vd520"><!--[-->`);
      const each_array = ensure_array_like(guides);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let guide = each_array[$$index];
        $$renderer2.push(`<span${attr("title", guide.snippet)} class="svelte-14vd520">${escape_html(guide.filename)}${escape_html(guide.page ? ` p.${guide.page}` : "")}</span>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function MobileRecommendationsSheet($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { open = false, products = [], guides = [] } = $$props;
    if (open) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="overlay svelte-18trjkr" role="presentation"></div> <section class="sheet svelte-18trjkr" aria-label="Productos recomendados"><div class="handle svelte-18trjkr"></div> <header class="svelte-18trjkr"><div><p class="svelte-18trjkr">Recomendaciones</p> <h2 class="svelte-18trjkr">${escape_html(products.length)} producto${escape_html(products.length === 1 ? "" : "s")}</h2></div> <button type="button" aria-label="Cerrar recomendaciones" class="svelte-18trjkr">×</button></header> <div class="content svelte-18trjkr"><!--[-->`);
      const each_array = ensure_array_like(products);
      for (let index = 0, $$length = each_array.length; index < $$length; index++) {
        let product = each_array[index];
        ProductRecommendationCard($$renderer2, { product, index, highlighted: index === 0 });
      }
      $$renderer2.push(`<!--]--> `);
      SourcesStrip($$renderer2, { guides });
      $$renderer2.push(`<!----></div></section>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function QuickQuestionChips($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { questions = [], disabled = false } = $$props;
    $$renderer2.push(`<div class="quick-actions svelte-jq8uye" aria-label="Preguntas rápidas"><!--[-->`);
    const each_array = ensure_array_like(questions);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let question = each_array[$$index];
      $$renderer2.push(`<button type="button"${attr("disabled", disabled, true)}${attr("title", question)} class="svelte-jq8uye">${escape_html(question)}</button>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function RecommendationPanel($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { products = [], guides = [], isLoading = false } = $$props;
    $$renderer2.push(`<aside aria-label="Recomendaciones RAG" class="svelte-1ijgwbj"><header class="svelte-1ijgwbj"><div><p class="svelte-1ijgwbj">Contexto RAG</p> <h2 class="svelte-1ijgwbj">Productos recomendados</h2></div> `);
    if (products.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="svelte-1ijgwbj">${escape_html(products.length)}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></header> `);
    if (isLoading) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="loading svelte-1ijgwbj"><p class="svelte-1ijgwbj">Buscando en catálogo...</p> <!--[-->`);
      const each_array = ensure_array_like(Array(3));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        each_array[$$index];
        $$renderer2.push(`<div class="skeleton svelte-1ijgwbj"><i class="svelte-1ijgwbj"></i> <b class="svelte-1ijgwbj"></b> <small class="svelte-1ijgwbj"></small></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else if (products.length) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div class="results svelte-1ijgwbj"><!--[-->`);
      const each_array_1 = ensure_array_like(products);
      for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
        let product = each_array_1[index];
        ProductRecommendationCard($$renderer2, { product, index, highlighted: index === 0 });
      }
      $$renderer2.push(`<!--]--> `);
      SourcesStrip($$renderer2, { guides });
      $$renderer2.push(`<!----></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="empty svelte-1ijgwbj"><div class="mark svelte-1ijgwbj">RAG</div> <h3 class="svelte-1ijgwbj">Consulta al asistente</h3> <p class="svelte-1ijgwbj">Los productos relevantes aparecerán aquí con precio, tipo de piel y evidencia del catálogo.</p></div>`);
    }
    $$renderer2.push(`<!--]--></aside>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const quickQuestions = [
      "Rutina para piel seca con presupuesto bajo",
      "Clienta de 40 años busca anti-edad",
      "Producto para piel grasa con brillo",
      "Protector solar para piel sensible",
      "Algo más económico para hidratar",
      "Cómo usar ácido hialurónico"
    ];
    let messages = [
      {
        role: "assistant",
        content: "Hola. Describe el perfil del cliente y te ayudo a recomendar productos del catalogo cargado."
      }
    ];
    let isLoading = false;
    let contextLoading = false;
    let recommendations = [];
    let guides = [];
    let showRecommendations = false;
    head("1uha8ag", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>RAG Cosmética</title>`);
      });
    });
    $$renderer2.push(`<main class="svelte-1uha8ag"><div class="app-layout svelte-1uha8ag"><div class="chat-panel svelte-1uha8ag"><header class="svelte-1uha8ag"><div><p class="svelte-1uha8ag">Asistente RAG</p> <h1 class="svelte-1uha8ag">Recomendador de cosmética</h1></div> <span${attr_class("svelte-1uha8ag", void 0, { "active": !isLoading })}>${escape_html("Listo")}</span></header> <section aria-live="polite" class="svelte-1uha8ag"><!--[-->`);
    const each_array = ensure_array_like(messages);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let message = each_array[$$index];
      ChatMessage($$renderer2, { role: message.role, content: message.content || "..." });
    }
    $$renderer2.push(`<!--]--></section> `);
    if (recommendations.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<button class="mobile-recs svelte-1uha8ag" type="button">Ver ${escape_html(recommendations.length)} producto${escape_html(recommendations.length === 1 ? "" : "s")} recomendados</button>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <footer class="svelte-1uha8ag">`);
    QuickQuestionChips($$renderer2, {
      questions: quickQuestions,
      disabled: isLoading
    });
    $$renderer2.push(`<!----> `);
    ChatInput($$renderer2, { disabled: isLoading });
    $$renderer2.push(`<!----></footer></div> <div class="recommendations-shell svelte-1uha8ag">`);
    RecommendationPanel($$renderer2, { products: recommendations, guides, isLoading: contextLoading });
    $$renderer2.push(`<!----></div></div> `);
    MobileRecommendationsSheet($$renderer2, {
      open: showRecommendations,
      products: recommendations,
      guides
    });
    $$renderer2.push(`<!----></main>`);
  });
}
export {
  _page as default
};

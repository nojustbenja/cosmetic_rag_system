import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, profile } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch product catalog (server-side context)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: products } = await supabase
      .from("products")
      .select("id,name,brand,category,price,description,stock,tags");

    const catalog = (products ?? [])
      .map(
        (p) =>
          `- [${p.id}] ${p.name} · ${p.brand} · ${p.category} · $${p.price} · stock:${p.stock} · tags:${p.tags.join(",")} · ${p.description}`
      )
      .join("\n");

    const profileLine = profile
      ? `Perfil del usuario: ${JSON.stringify(profile)}.`
      : "Perfil del usuario: no especificado.";

    const systemPrompt = `Eres "Aura", asesora experta en cosmética y belleza de una tienda online. Cálida, cercana y muy conciso, como una amiga consultora de belleza disponible 24/7.

${profileLine}

Tu especialidad: skincare, maquillaje, fragancias y cuidado capilar. Conoces tipos de piel (seca, grasa, mixta, sensible), rutinas (día/noche), ingredientes (retinol, ácido hialurónico, vitamina C), tonos de maquillaje, familias olfativas y necesidades capilares.

Tu objetivo:
1. Entender qué busca el usuario haciendo máximo 1 pregunta clarificadora cuando falte info clave (tipo de piel, ocasión, presupuesto, edad, preferencia de acabado, etc.).
2. Recomendar entre 1 y 3 productos del catálogo que mejor encajen con su perfil y necesidad.
3. Justificar cada recomendación con una frase técnica pero clara (por qué le va a funcionar).
4. Cuando recomiendes productos, incluye al final del mensaje una línea EXACTA con este formato:
RECS: id1,id2,id3
(solo los UUIDs separados por comas, sin texto extra en esa línea)

Si el usuario solo saluda o explora, NO incluyas la línea RECS.
Nunca inventes productos. Solo recomienda los del catálogo de abajo.
Responde en español, con tono amable y experto. Máximo 4 frases antes de RECS.

CATÁLOGO DISPONIBLE:
${catalog}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes, intenta en un momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Agrega fondos en Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-shopper error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

"""
Evaluación del pipeline RAG usando RAGAS.

Usa kilo-auto/balanced vía la interfaz OpenAI-compatible de Kilo.
Ejecutar: cd backend && python -m rag.evaluate
"""

import asyncio
import os
import sys
import json

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    ContextPrecision,
    ContextRecall,
    Faithfulness,
    AnswerRelevancy,
)

from config import settings
from rag.pipeline import (
    retrieve_context, 
    generate_recommender_response, 
    generate_contextual_query, 
    extract_client_profile
)


# ---------------------------------------------------------------------------
# Evaluator LLM – usa kilo-auto/balanced (OpenAI-compatible)
# ---------------------------------------------------------------------------

def get_evaluator_llm():
    """Crea el LLM evaluador usando la API compatible de Kilo."""
    from openai import OpenAI
    from ragas.llms import llm_factory

    api_key = settings.kilo_api_key
    if not api_key:
        print("⚠️  KILO_API_KEY no encontrada en .env. La evaluación fallará.")
        api_key = "dummy"

    client = OpenAI(
        base_url="https://api.kilo.ai/api/gateway",
        api_key=api_key,
        timeout=120,
        max_retries=3,
    )
    return llm_factory("openai/gpt-4o-mini", client=client)


def get_evaluator_embeddings():
    """Usa el mismo modelo de embeddings local del proyecto."""
    from ragas.embeddings import HuggingFaceEmbeddings

    return HuggingFaceEmbeddings(model=settings.embedding_model)


# ---------------------------------------------------------------------------
# Dataset de evaluación
# ---------------------------------------------------------------------------

EVAL_QUESTIONS = [
    "Tengo piel sensible y seca, necesito una rutina de noche",
    "¿Qué serum recomiendan para piel seca que de luminosidad?",
    "Busco un protector solar para piel grasa que no deje residuo blanco",
    "Soy alérgica a los sulfatos, ¿tienen algún limpiador?",
    "Necesito un producto antiedad de noche para mi piel",
    "¿El bloqueador Solare me sirve para piel mixta?",
    "Quiero un limpiador facial profundo para piel sensible",
    "¿Cuál es el rol de los dermocosméticos en el tratamiento del acné según las guías médicas?",
]

GROUND_TRUTHS = [
    "Para una rutina de noche en piel sensible y seca, la Crema Reparadora Noche Velvet de Lumère es ideal. Renueva la piel, ofrece nutrición nocturna y tiene retinol suave con péptidos.",
    "El Sérum Hidratante Glow Drops de Lumère es excelente. Tiene ácido hialurónico y vitamina B5 para hidratación profunda y luminosidad inmediata, formulado para piel seca.",
    "El Protector Solar Invisible SPF50 de Solare es la mejor opción. Ofrece protección UV de amplio espectro, acabado mate y no deja residuo blanco, ideal para piel grasa y mixta.",
    "Sí, te recomendamos el Limpiador Facial Espuma Suave de Lumère. Su fórmula con extractos naturales es sin sulfatos y equilibra la piel sin resecar.",
    "La Crema Reparadora Noche Velvet de Lumère es perfecta para cuidado antiedad nocturno. Contiene retinol suave y péptidos.",
    "Sí, el Protector Solar Invisible SPF50 de Solare está diseñado y recomendado para piel mixta, normal y grasa.",
    "Para limpieza profunda en piel sensible, te sugerimos el Limpiador Facial Espuma Suave de Lumère. Limpia sin resecar y es seguro para pieles sensibles.",
    "Según las guías médicas, los dermocosméticos juegan un rol importante en el manejo del acné al mejorar la función de la barrera cutánea, reducir efectos secundarios de los tratamientos tópicos y ayudar en el mantenimiento a largo plazo.",
]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def run_rag_predictions():
    """Ejecuta el pipeline RAG para cada pregunta y recolecta contextos + respuestas."""
    contexts_list = []
    answers_list = []

    for i, question in enumerate(EVAL_QUESTIONS, 1):
        print(f"\n[{i}/{len(EVAL_QUESTIONS)}] Pregunta: {question}")

        session_history = []
        # 1. Pipeline-aligned: Extract profile and generate contextual queries
        profile = await extract_client_profile(question, session_history)
        search_queries = await generate_contextual_query(question, session_history, profile)

        # 2. Recuperar contexto usando el pipeline real
        context_payload, retrieved_items = await retrieve_context(question, search_queries, filters=None)
        ctx_texts = [item["text"] for item in retrieved_items]
        contexts_list.append(ctx_texts)

        # 3. Generar respuesta
        response_text = ""
        try:
            async for token in generate_recommender_response(
                question, session_history, retrieved_items, soft_match=False, profile=profile
            ):
                response_text += token
        except Exception as e:
            print(f" [!] Error generando respuesta (API rate limit/error): {e}")
            response_text = "Error en generación."

        answers_list.append(response_text)
        print(f"   → Respuesta: {response_text[:80].replace(chr(10), ' ')}...")

    return contexts_list, answers_list


async def main():
    print("=" * 60)
    print("  EVALUACIÓN RAG con RAGAS")
    print(f"  Modelo evaluador: openai/gpt-4o-mini (vía Kilo)")
    print(f"  Preguntas de test: {len(EVAL_QUESTIONS)}")
    print("=" * 60)

    # 1. Generar predicciones
    print("\n📋 Paso 1: Generando respuestas del RAG...")
    contexts_list, answers_list = await run_rag_predictions()

    # 2. Armar dataset
    eval_dataset = Dataset.from_dict({
        "question": EVAL_QUESTIONS,
        "answer": answers_list,
        "contexts": contexts_list,
        "ground_truth": GROUND_TRUTHS,
    })

    # 3. Configurar evaluadores
    print("\n🔧 Paso 2: Configurando evaluadores...")
    eval_llm = get_evaluator_llm()
    eval_emb = get_evaluator_embeddings()

    # 4. Evaluar
    print("\n📊 Paso 3: Ejecutando evaluación RAGAS (puede demorar 2-4 min)...")
    try:
        results = evaluate(
            eval_dataset,
            metrics=[ContextPrecision(), ContextRecall(), Faithfulness(), AnswerRelevancy()],
            llm=eval_llm,
            embeddings=eval_emb,
            raise_exceptions=False,
        )

        # Extraer scores del EvaluationResult (compatible con RAGAS 0.4.x)
        import pandas as pd

        scores = {}

        def _flatten_nums(val):
            """Recursively extract numeric values from nested lists/arrays."""
            import numpy as np
            if isinstance(val, (int, float)):
                if isinstance(val, float) and val != val:  # NaN check
                    return []
                return [float(val)]
            if isinstance(val, np.ndarray):
                return _flatten_nums(val.tolist())
            if isinstance(val, list):
                out = []
                for item in val:
                    out.extend(_flatten_nums(item))
                return out
            return []

        # Método 1: atributo interno _scores_dict (contiene listas per-sample)
        if hasattr(results, "_scores_dict") and results._scores_dict:
            import numpy as np
            for k, v in results._scores_dict.items():
                nums = _flatten_nums(v)
                scores[k] = float(np.mean(nums)) if nums else float("nan")

        # Método 2: to_pandas() con coerción numérica
        if not scores:
            try:
                df = results.to_pandas()
                skip = {"question", "answer", "contexts", "ground_truth"}
                metric_cols = [c for c in df.columns if c not in skip]
                for col in metric_cols:
                    numeric = pd.to_numeric(df[col], errors="coerce")
                    scores[col] = float(numeric.mean())
            except Exception:
                pass

        # Método 3: parsear el repr (último recurso)
        if not scores:
            import re
            raw = repr(results)
            pairs = re.findall(r"'(\w+)':\s*([\d.]+|nan)", raw)
            for name, val in pairs:
                scores[name] = float(val) if val != "nan" else float("nan")

        print("\n" + "=" * 60)
        print("  📈 RESULTADOS DE LA EVALUACIÓN")
        print("=" * 60)

        if not scores:
            print("  No se pudieron extraer métricas. Resultado crudo:")
            print(f"  {results}")
        else:
            for metric_name, score in scores.items():
                # Safety coercion: ensure score is always a float
                if not isinstance(score, (int, float)):
                    try:
                        score = float(score)
                    except (TypeError, ValueError):
                        score = float("nan")

                if score is None or (isinstance(score, float) and score != score):
                    emoji = "⚪"
                    display = "N/A (timeout o error)"
                elif score >= 0.8:
                    emoji = "🟢"
                    display = f"{score:.4f}"
                elif score >= 0.5:
                    emoji = "🟡"
                    display = f"{score:.4f}"
                else:
                    emoji = "🔴"
                    display = f"{score:.4f}"
                print(f"  {emoji} {metric_name:>20}: {display}")

        print("=" * 60)

        # Guardar resultados en JSON
        results_path = os.path.join(os.path.dirname(__file__), "..", "eval_results.json")
        with open(results_path, "w") as f:
            serializable = {}
            for k, v in scores.items():
                if v is None or (isinstance(v, float) and v != v):
                    serializable[k] = None
                else:
                    serializable[k] = round(float(v), 4)
            json.dump(serializable, f, indent=2)
        print(f"\n💾 Resultados guardados en: {os.path.abspath(results_path)}")

    except Exception as e:
        print(f"\n❌ Error en la evaluación: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())

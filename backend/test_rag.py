import asyncio
import os
import sys

# Asegurar que las importaciones funcionen desde la raíz del backend
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from rag.retriever import retrieve_all
from rag.pipeline import extract_client_profile

async def run_tests():
    print("--- INICIANDO PRUEBAS AUTOMATIZADAS DE RAG ---")
    
    test_cases = [
        {
            "name": "Prueba de Zona (Cuerpo)",
            "query": "Hola, este fin de semana voy a la playa y necesito bloqueador. Estoy buscando uno que sea súper fácil de aplicar en todo el cuerpo, ojalá en spray y que resista el agua. Mi piel es normal.",
            "expected_top": "Protector Solar Corporal Spray FPS50"
        },
        {
            "name": "Prueba de Sensibilidad y Problema (Rojeces)",
            "query": "Mi piel del rostro últimamente está muy irritada y con muchas rojeces. Siento que todo me arde. Necesito una crema que me calme y repare la barrera de mi cara.",
            "expected_top": "Crema Hidratante Anti-Rojez"
        },
        {
            "name": "Prueba de Función (Waterproof)",
            "query": "Uso máscara de pestañas a prueba de agua y base de larga duración todos los días. Necesito un limpiador para la noche que realmente derrita todo ese maquillaje sin dejarme la cara tirante.",
            "expected_top": "Bálsamo Desmaquillante Nutritivo"
        },
        {
            "name": "Prueba de Focalización (Ojos)",
            "query": "Tengo la piel mixta, pero mi mayor problema no es el rostro en general, sino que despierto con muchas bolsas y ojeras muy oscuras. Me veo muy cansada, ¿qué producto me ayuda con eso?",
            "expected_top": "Contorno de Ojos Descongestionante"
        },
        {
            "name": "Prueba de Contradicción de Filtros (No sensible)",
            "query": "Tengo la piel súper grasa, con muchos granitos y poros obstruidos. Me gustaría algo para exfoliar mi cara en la noche. Por suerte mi piel no es para nada sensible, aguanta todo.",
            "expected_top": "Exfoliante Líquido AHA/BHA"
        },
        {
            "name": "Prueba de Atributo Específico (Vitamina C)",
            "query": "Quiero un sérum para usar en las mañanas que me dé mucha luminosidad, unifique el tono y sea antioxidante para usar antes del bloqueador.",
            "expected_top": "Sérum Vitamina C Antioxidante"
        }
    ]

    passed = 0
    failed = 0

    for i, tc in enumerate(test_cases, 1):
        print(f"\nTest {i}: {tc['name']}")
        print(f"Query: \"{tc['query']}\"")
        
        # Probar el Profiler
        profile = extract_client_profile(tc['query'])
        print(f"-> Perfil extraído: tipo_piel={profile.get('skin_type')}, categoria={profile.get('category')}")
        
        # Probar el Retriever
        results = await retrieve_all(tc['query'])
        
        # Filtrar solo productos (ignorar guías)
        products = [r for r in results if r["metadata"].get("source") == "catalog"]
        
        if not products:
            print("❌ FAILED: No se recuperaron productos. (Filtro demasiado estricto)")
            failed += 1
            continue
            
        top_product_name = products[0]["metadata"].get("product_name", "")
        
        if tc['expected_top'] in top_product_name:
            print(f"✅ PASSED: El producto top 1 es '{top_product_name}'")
            passed += 1
        else:
            print(f"❌ FAILED: Se esperaba '{tc['expected_top']}', pero el top 1 fue '{top_product_name}'.")
            failed += 1
            
            # Ver si estaba en el top 3
            top_3_names = [p["metadata"].get("product_name", "") for p in products[:3]]
            if any(tc['expected_top'] in name for name in top_3_names):
                print(f"   (Nota: El producto esperado sí estaba entre los Top 3: {top_3_names})")
                
    print(f"\n--- RESUMEN: {passed} correctos, {failed} fallidos ---")
    if failed > 0:
        print("💡 Los filtros rígidos del retriever (como buscar palabras literales 'sensible' o 'grasa') pueden estar causando falsos negativos o priorizando mal.")

if __name__ == "__main__":
    asyncio.run(run_tests())

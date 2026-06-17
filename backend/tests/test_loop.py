import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from rag.pipeline import extract_client_profile

history = [
    {"role": "user", "content": "Busco una crema para el rostro"},
    {"role": "assistant", "content": "Para ayudarte mejor, ¿me podrías contar qué tipo de piel tienes y cuál es tu objetivo principal (por ejemplo, hidratación, control de acné, antiedad)?"},
    {"role": "user", "content": "tengo piel grasa y busco controlar el acne"}
]
message = "tienes alguna opcion de la marca cerave?"

profile = extract_client_profile(message, history)
print(profile)

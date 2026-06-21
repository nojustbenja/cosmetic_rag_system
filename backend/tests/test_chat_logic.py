import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.models import ChatRequest
from rag.pipeline import extract_client_profile

@pytest.mark.asyncio
async def test_extract_client_profile_avoids_repetitive_questions():
    message = "Busco una crema de día"
    frontend_profile = {
        "skin_type": "seca",
        "age": 32
    }
    profile = await extract_client_profile(message, session_history=[], frontend_profile=frontend_profile)
    assert "tipo de piel" not in profile["missing_fields"]

def test_backend_is_stateless():
    request = ChatRequest(
        message="Hola",
        session_id="123",
        profile={"skin_type": "seca"},
        history=[{"role": "user", "content": "Previous message"}]
    )
    assert hasattr(request, 'history')
    assert len(request.history) == 1

@pytest.mark.asyncio
async def test_extract_client_profile_chip_match():
    profile_seca = await extract_client_profile("seca", session_history=[])
    assert profile_seca["skin_type"] == "seca"
    profile_sensible = await extract_client_profile("sensible", session_history=[])
    assert profile_sensible["skin_type"] == "sensible"

@pytest.mark.asyncio
async def test_scenario_1_initial_profile_provision():
    # User provides profile information in their first message
    message = "Hola, busco una crema hidratante para piel seca y uso de dia."
    profile = await extract_client_profile(message, session_history=[])
    
    assert "tipo de piel" not in profile["missing_fields"]
    assert "objetivo" not in profile["missing_fields"]
    assert "día o noche" not in profile["missing_fields"]
    assert profile["skin_type"] == "seca"
    assert profile["concern"] == "hidratacion"
    assert profile["usage_moment"] == "dia"

@pytest.mark.asyncio
async def test_scenario_2_subsequent_turns_the_loop():
    # The loop happens because the naive approach string-matches the AI's question, overriding the user's answer,
    # OR the user's natural language doesn't match the exact word boundaries, causing it to be forgotten in subsequent turns.
    history = [
        {"role": "user", "content": "Busco una crema para el rostro"},
        {"role": "assistant", "content": "Para ayudarte, ¿me podrías contar qué tipo de piel tienes (seca, grasa, mixta, sensible) y cuál es tu objetivo?"},
        {"role": "user", "content": "Mi piel es mixta y quiero algo para el acne"},
        {"role": "assistant", "content": "Te recomiendo esta crema..."},
    ]
    message = "¿Y tienes alguna opción de noche?"
    
    profile = await extract_client_profile(message, session_history=history)
    
    # The loop bug reproduces if we expect the user's profile to be retained,
    # but the naive matching picks up "seca" from the assistant's previous question
    # instead of the user's actual "mixta" response.
    assert profile["skin_type"] == "mixta", f"Bug reproduced: naive approach extracted {profile['skin_type']} instead of mixta"
    assert profile["concern"] == "acne", "Failed to retain concern"
    assert "tipo de piel" not in profile["missing_fields"]

@pytest.mark.asyncio
async def test_scenario_3_missing_profile():
    # Baseline test
    message = "Busco una crema"
    profile = await extract_client_profile(message, session_history=[])
    
    assert "tipo de piel" in profile["missing_fields"]
    assert "objetivo" in profile["missing_fields"]


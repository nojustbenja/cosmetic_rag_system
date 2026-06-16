import pytest
from pydantic import ValidationError
import sys
import os

# Add backend to path so imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.models import ChatRequest
from rag.pipeline import extract_client_profile

def test_extract_client_profile_avoids_repetitive_questions():
    """
    Test that if the frontend profile already contains a required field (like skin_type),
    the extraction logic doesn't mark it as 'missing', which would trigger a repetitive profiling question.
    """
    message = "Busco una crema de día"
    
    # Simulate the frontend sending the profile where skin_type is ALREADY provided
    frontend_profile = {
        "skin_type": "seca",
        "age": 32
    }
    
    profile = extract_client_profile(message, session_history=[], frontend_profile=frontend_profile)
    
    # Since skin_type is provided, it shouldn't be in missing_fields!
    assert "tipo de piel" not in profile["missing_fields"], "Memory Leak / Repetitive Question Bug: AI asks for skin type even though it's in the frontend profile!"

def test_backend_is_stateless():
    """
    Test that the ChatRequest model now accepts history from the frontend.
    This prevents the backend from keeping a global 'sessions' dictionary which causes memory leaks
    and breaks session restoration from the frontend.
    """
    request = ChatRequest(
        message="Hola",
        session_id="123",
        profile={"skin_type": "seca"},
        history=[{"role": "user", "content": "Previous message"}]
    )
    
    assert hasattr(request, 'history'), "Memory Leak Bug: Backend must accept history from frontend to be stateless."
    assert len(request.history) == 1
    assert request.history[0]["content"] == "Previous message"

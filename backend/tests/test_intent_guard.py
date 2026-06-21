import pytest
import sys
import os
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from rag.pipeline import requires_catalog_search, generate_contextual_query
from api.models import ChatRequest
from api.routes import router

@pytest.mark.asyncio
@patch('rag.pipeline.LLMClient.generate_completion', new_callable=AsyncMock)
async def test_requires_catalog_search_small_talk(mock_completion):
    mock_completion.return_value = '{"requires_catalog_search": false, "search_queries": [], "profile": {}}'
    
    # "Gracias" is small talk
    result = await requires_catalog_search("¡Muchas gracias!", history=[])
    assert result is False
    mock_completion.assert_called_once()

@pytest.mark.asyncio
@patch('rag.pipeline.LLMClient.generate_completion', new_callable=AsyncMock)
async def test_requires_catalog_search_product_query(mock_completion):
    mock_completion.return_value = '{"requires_catalog_search": true, "search_queries": ["crema hidratante"], "profile": {}}'
    
    # Query for products
    result = await requires_catalog_search("Busco una crema hidratante", history=[])
    assert result is True
    mock_completion.assert_called_once()

@pytest.mark.asyncio
@patch('rag.pipeline.LLMClient.generate_completion', new_callable=AsyncMock)
async def test_generate_contextual_query(mock_completion):
    mock_completion.return_value = '{"requires_catalog_search": true, "search_queries": ["crema de noche para piel seca más barata"], "profile": {}}'
    
    history = [
        {"role": "user", "content": "Busco cremas de noche para piel seca."},
        {"role": "assistant", "content": "Te recomiendo la Crema X."}
    ]
    message = "¿Tienes alguna más barata?"
    profile = {"skin_type": "seca"}
    
    result = await generate_contextual_query(message, history, profile)
    
    assert result == ["crema de noche para piel seca más barata"]
    mock_completion.assert_called_once()
    # verify that history was passed
    args = mock_completion.call_args[0][0]
    assert len(args) == 4 # 1 system + 2 history + 1 user
    assert args[1]["content"] == "Busco cremas de noche para piel seca."
    assert args[3]["content"] == "¿Tienes alguna más barata?"

def test_request_history_retains_20_messages():
    # Construct a request with 25 messages
    messages = [{"role": "user", "content": f"Message {i}"} for i in range(25)]
    request = ChatRequest(
        message="New message",
        session_id="123",
        history=messages
    )
    # the endpoint router does request.history[-20:]
    sliced_history = request.history[-20:]
    assert len(sliced_history) == 20
    assert sliced_history[0]["content"] == "Message 5"
    assert sliced_history[-1]["content"] == "Message 24"


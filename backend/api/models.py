from __future__ import annotations

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    session_id: str = Field(min_length=1)
    profile: dict = Field(default_factory=dict)
    history: list[dict] = Field(default_factory=list)


class ChatMessage(BaseModel):
    role: str
    content: str


class QuestionSuggestion(BaseModel):
    id: str
    text: str
    group: str
    label: str
    score: float = 0
    is_trending: bool = False


class QuestionEventRequest(BaseModel):
    event_type: str = Field(pattern="^(impression|click|sent|answered|stop|product_view|cart_add|checkout)$")
    session_id: str = Field(min_length=1, max_length=120)
    question: str = Field(default="", max_length=500)
    suggestion_id: str = Field(default="", max_length=120)
    source: str = Field(default="", max_length=80)
    product_ids: list[str] = Field(default_factory=list)


class QuestionMetric(BaseModel):
    question: str
    normalized: str
    total: int = 0
    sent_count: int = 0
    click_count: int = 0
    answered_count: int = 0
    impression_count: int = 0
    stop_count: int = 0
    score: float = 0
    last_seen: str = ""


class QuestionStatsResponse(BaseModel):
    period: str
    kpis: dict
    trending: list[QuestionMetric]
    faq: list[QuestionMetric]


class ReasonRequest(BaseModel):
    message: str
    product: dict


class ProductActionRequest(BaseModel):
    message: str = Field(default="")
    product: dict
    action: str = Field(pattern="^(why_this|cheaper|premium)$")
    profile: dict = Field(default_factory=dict)


class ProductCreateRequest(BaseModel):
    nombre: str = Field(min_length=1)
    marca: str = Field(min_length=1)
    categoria: str = Field(min_length=1)
    tipo_piel: str = Field(default="todas")
    ingredientes: str = Field(default="")
    beneficios: str = Field(default="")
    precio: float = Field(gt=0)
    descripcion: str = Field(min_length=1)
    image_url: str = Field(default="")
    stock: int = Field(default=0, ge=0)
    tags: str = Field(default="")


class AiAssistRequest(BaseModel):
    name: str = Field(min_length=1)
    brand: str = Field(min_length=1)


class OrderCreateRequest(BaseModel):
    ticket_number: str = Field(min_length=1)
    timestamp: str = Field(min_length=1)
    client_name: str = Field(default="CLIENTE GENERAL")
    skin_type: str = Field(default="")
    items: list[dict] = Field(default_factory=list)
    total: float = Field(ge=0)
    status: str = Field(default="pendiente")



class CsvImportRequest(BaseModel):
    csv_content: str = Field(min_length=5)
    mode: str = Field(default="merge")  # "merge" or "replace"


class ProductUpdateRequest(BaseModel):
    original_name: str = Field(min_length=1)
    nombre: str = Field(min_length=1)
    marca: str = Field(min_length=1)
    categoria: str = Field(min_length=1)
    tipo_piel: str = Field(default="todas")
    ingredientes: str = Field(default="")
    beneficios: str = Field(default="")
    precio: float = Field(gt=0)
    descripcion: str = Field(min_length=1)
    image_url: str = Field(default="")
    stock: int = Field(default=0, ge=0)
    tags: str = Field(default="")


class ProviderConfigRequest(BaseModel):
    provider: str = Field(min_length=1)
    model: str = Field(default="")
    base_url: str = Field(default="")
    api_key: str = Field(default="")
    kilo_mode: str = Field(default="free")

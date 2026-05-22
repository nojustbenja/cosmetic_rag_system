from __future__ import annotations

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    session_id: str = Field(min_length=1)


class ChatMessage(BaseModel):
    role: str
    content: str


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



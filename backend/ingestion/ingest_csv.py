from __future__ import annotations

import csv
from pathlib import Path

import chromadb

from config import settings
from rag.embeddings import embed_batch


DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "productos.csv"


def format_clp(value: object) -> str:
    try:
        amount = int(float(str(value).replace(".", "").replace(",", ".")))
    except (TypeError, ValueError):
        return "N/D"
    return f"CLP ${amount:,}".replace(",", ".")


def product_to_text(product: dict[str, str]) -> str:
    return (
        f"Producto: {product.get('nombre', '')}. "
        f"Marca: {product.get('marca', '')}. "
        f"Categoria: {product.get('categoria', '')}. "
        f"Tipo de piel: {product.get('tipo_piel', '')}. "
        f"Ingredientes: {product.get('ingredientes', '')}. "
        f"Beneficios: {product.get('beneficios', '')}. "
        f"Precio: {format_clp(product.get('precio', ''))}. "
        f"Descripcion: {product.get('descripcion', '')}"
    )


def ingest_products(csv_path: Path = DATA_PATH) -> int:
    if not csv_path.exists():
        raise FileNotFoundError(f"No existe el catalogo: {csv_path}")

    with csv_path.open(newline="", encoding="utf-8") as file:
        products = list(csv.DictReader(file))

    client = chromadb.PersistentClient(path=settings.chroma_path)
    collection = client.get_or_create_collection(name="productos")

    ids = [f"producto-{index}-{product.get('nombre', '').lower().replace(' ', '-')}" for index, product in enumerate(products)]
    documents = [product_to_text(product) for product in products]
    embeddings = embed_batch(documents)
    metadatas = [
        {
            "source": "catalog",
            "brand": product.get("marca", ""),
            "category": product.get("categoria", ""),
            "skin_types": product.get("tipo_piel", ""),
            "price": float(product.get("precio") or 0),
            "product_name": product.get("nombre", ""),
        }
        for product in products
    ]

    if ids:
        collection.upsert(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)
    return len(ids)


if __name__ == "__main__":
    print(f"Productos ingresados: {ingest_products()}")

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
    try:
        client.delete_collection(name="productos")
    except Exception:
        pass
    collection = client.get_or_create_collection(
        name="productos",
        metadata={"hnsw:space": "cosine"},
    )

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
            "image_url": product.get("image_url", ""),
            "stock": int(product.get("stock") or 0),
            "tags": product.get("tags", ""),
            "description": product.get("descripcion", ""),
            "ingredients": product.get("ingredientes", ""),
            "benefits": product.get("beneficios", ""),
        }
        for product in products
    ]

    if ids:
        collection.upsert(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)
    return len(ids)


def add_product_to_csv(product: dict[str, object], csv_path: Path = DATA_PATH) -> None:
    fieldnames = ["nombre", "marca", "categoria", "tipo_piel", "ingredientes", "beneficios", "precio", "descripcion", "image_url", "stock", "tags"]
    row = {k: str(product.get(k, "")).strip() for k in fieldnames}
    try:
        row["precio"] = str(int(float(str(product.get("precio", 0)))))
    except (ValueError, TypeError):
        row["precio"] = "0"
    try:
        row["stock"] = str(int(float(str(product.get("stock", 0)))))
    except (ValueError, TypeError):
        row["stock"] = "0"

    file_exists = csv_path.exists()
    with csv_path.open("a", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        if not file_exists or csv_path.stat().st_size == 0:
            writer.writeheader()
        writer.writerow(row)


def import_csv_content(csv_content: str, mode: str = "merge", csv_path: Path = DATA_PATH) -> int:
    fieldnames = ["nombre", "marca", "categoria", "tipo_piel", "ingredientes", "beneficios", "precio", "descripcion", "image_url", "stock", "tags"]
    existing_products: list[dict] = []
    
    if mode == "merge" and csv_path.exists():
        with csv_path.open(newline="", encoding="utf-8") as file:
            existing_products = list(csv.DictReader(file))

    # Parse raw csv content
    lines = csv_content.strip().splitlines()
    reader = csv.DictReader(lines)
    new_products = list(reader)

    if mode == "replace":
        final_products = []
        for np in new_products:
            row = {k: str(np.get(k, "")).strip() for k in fieldnames}
            if row["nombre"]:
                final_products.append(row)
    else:  # merge
        product_map = {str(p.get("nombre", "")).lower().strip(): p for p in existing_products if p.get("nombre")}
        for np in new_products:
            name = str(np.get("nombre", "")).lower().strip()
            if not name:
                continue
            row = {k: str(np.get(k, "")).strip() for k in fieldnames}
            product_map[name] = row
        final_products = list(product_map.values())

    with csv_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(final_products)

    return len(final_products)


def update_product_in_csv(original_name: str, updated_product: dict[str, object], csv_path: Path = DATA_PATH) -> bool:
    fieldnames = ["nombre", "marca", "categoria", "tipo_piel", "ingredientes", "beneficios", "precio", "descripcion", "image_url", "stock", "tags"]
    
    if not csv_path.exists():
        return False
        
    products: list[dict] = []
    with csv_path.open(newline="", encoding="utf-8") as file:
        products = list(csv.DictReader(file))
        
    found = False
    original_name_lower = original_name.lower().strip()
    
    for product in products:
        if str(product.get("nombre", "")).lower().strip() == original_name_lower:
            # Update all fields
            for key in fieldnames:
                product[key] = str(updated_product.get(key, "")).strip()
            
            # Format numeric fields
            try:
                product["precio"] = str(int(float(str(updated_product.get("precio", 0)))))
            except (ValueError, TypeError):
                product["precio"] = "0"
            try:
                product["stock"] = str(int(float(str(updated_product.get("stock", 0)))))
            except (ValueError, TypeError):
                product["stock"] = "0"
                
            found = True
            break
            
    if not found:
        return False
        
    with csv_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(products)
        
    return True


if __name__ == "__main__":
    print(f"Productos ingresados: {ingest_products()}")



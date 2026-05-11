from __future__ import annotations

from pathlib import Path

import chromadb
import fitz

from config import settings
from ingestion.chunking import chunk_text
from rag.embeddings import embed_batch


GUIDES_PATH = Path(__file__).resolve().parents[1] / "data" / "guias"


def extract_pdf_pages(pdf_path: Path) -> list[tuple[int, str]]:
    with fitz.open(pdf_path) as document:
        return [(page_number + 1, page.get_text("text")) for page_number, page in enumerate(document)]


def ingest_pdfs(guides_path: Path = GUIDES_PATH) -> int:
    client = chromadb.PersistentClient(path=settings.chroma_path)
    collection = client.get_or_create_collection(name="guias")
    total = 0

    for pdf_path in sorted(guides_path.glob("*.pdf")):
        ids: list[str] = []
        documents: list[str] = []
        metadatas: list[dict] = []

        for page_number, text in extract_pdf_pages(pdf_path):
            for chunk_index, chunk in enumerate(chunk_text(text)):
                ids.append(f"guia-{pdf_path.stem}-p{page_number}-c{chunk_index}")
                documents.append(chunk)
                metadatas.append(
                    {
                        "source": "guide",
                        "filename": pdf_path.name,
                        "page": page_number,
                    }
                )

        embeddings = embed_batch(documents)
        if ids:
            collection.upsert(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)
            total += len(ids)
    return total


if __name__ == "__main__":
    print(f"Chunks de guias ingresados: {ingest_pdfs()}")

from __future__ import annotations

from ingestion.ingest_csv import ingest_products
from ingestion.ingest_pdfs import ingest_pdfs


def main() -> None:
    product_count = ingest_products()
    guide_count = ingest_pdfs()
    print(f"Productos ingresados: {product_count}")
    print(f"Chunks de guias ingresados: {guide_count}")


if __name__ == "__main__":
    main()

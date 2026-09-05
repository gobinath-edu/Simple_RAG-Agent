"""
Ingestion pipeline: PDF -> text -> chunks -> embeddings -> ChromaDB.

Refactored from the original vector_db.py script so it can be called
per-document from the FastAPI backend instead of running once over a
single hardcoded file.
"""

import uuid
from pathlib import Path

from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200


def extract_text(pdf_path: Path) -> tuple[str, int]:
    reader = PdfReader(str(pdf_path))
    full_text = ""
    for page in reader.pages:
        text = page.extract_text()
        if text:
            full_text += text + "\n"
    return full_text, len(reader.pages)


def chunk_text(full_text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )
    return splitter.split_text(full_text)


def ingest_pdf(pdf_path: Path, filename: str, collection, embedding_model) -> dict:
    """
    Runs a PDF through the full ingestion pipeline and stores the
    resulting chunks in the given Chroma collection, tagged with a
    fresh doc_id so they can be listed/deleted independently later.
    """
    full_text, page_count = extract_text(pdf_path)

    if not full_text.strip():
        raise ValueError("No extractable text found in this PDF (it may be scanned/image-only).")

    chunks = chunk_text(full_text)
    if not chunks:
        raise ValueError("Text was extracted but no chunks were produced.")

    embeddings = embedding_model.encode(chunks, show_progress_bar=False)

    doc_id = uuid.uuid4().hex[:12]
    ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "doc_id": doc_id,
            "filename": filename,
            "chunk_index": i,
            "page_count": page_count,
        }
        for i in range(len(chunks))
    ]

    collection.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings.tolist(),
        metadatas=metadatas,
    )

    return {
        "doc_id": doc_id,
        "filename": filename,
        "page_count": page_count,
        "chunk_count": len(chunks),
        "char_count": len(full_text),
    }
